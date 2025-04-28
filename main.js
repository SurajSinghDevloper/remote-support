const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require("electron")
const path = require("path")
const isDev = require("electron-is-dev")
const { keyboard, mouse, Button, Point, screen: nutScreen, Key } = require("@nut-tree-fork/nut-js")

let mainWindow = null

// Configure nut.js settings for better performance
keyboard.config.autoDelayMs = 0
mouse.config.autoDelayMs = 0
mouse.config.mouseSpeed = 1000 // Faster mouse movement

// Map of modifier keys to track their state
const modifierState = {
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
}

async function createWindow() {
    try {
        // Configure nut.js resource directory
        const nutResources = path.join(__dirname, "node_modules", "@nut-tree-fork", "nut-js", "lib", "resources")
        nutScreen.config.resourceDirectory = nutResources

        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, "preload.js"),
                webSecurity: false,
                allowRunningInsecureContent: true,
            },
        })

        mainWindow.on("closed", () => {
            mainWindow = null
        })

        // Get screen sources handler
        ipcMain.handle("get-video-sources", async () => {
            try {
                return await desktopCapturer.getSources({
                    types: ["screen", "window"],
                    thumbnailSize: { width: 150, height: 150 },
                })
            } catch (error) {
                console.error("Error getting video sources:", error)
                return []
            }
        })

        // Get screen size handler
        ipcMain.handle("get-screen-size", () => {
            const primaryDisplay = screen.getPrimaryDisplay()
            return {
                width: primaryDisplay.size.width,
                height: primaryDisplay.size.height,
                scaleFactor: primaryDisplay.scaleFactor,
            }
        })

        // Mouse movement handler with high priority
        ipcMain.on("mouse-move", async (_, data) => {
            try {
                // Scale coordinates to actual screen size
                const { x, y, screenWidth, screenHeight } = data
                const primaryDisplay = screen.getPrimaryDisplay()
                const actualWidth = primaryDisplay.size.width
                const actualHeight = primaryDisplay.size.height

                // Calculate the scaled position with precise pixel mapping
                const scaledX = Math.floor((x / screenWidth) * actualWidth)
                const scaledY = Math.floor((y / screenHeight) * actualHeight)

                // Move the mouse to the calculated position
                await mouse.move(new Point(scaledX, scaledY))
            } catch (error) {
                console.error("Error moving mouse:", error)
            }
        })

        // Mouse click handler
        ipcMain.on("mouse-click", async (_, data) => {
            try {
                // Scale coordinates to actual screen size
                const { x, y, button, screenWidth, screenHeight } = data
                const primaryDisplay = screen.getPrimaryDisplay()
                const actualWidth = primaryDisplay.size.width
                const actualHeight = primaryDisplay.size.height

                // Calculate the scaled position
                const scaledX = Math.floor((x / screenWidth) * actualWidth)
                const scaledY = Math.floor((y / screenHeight) * actualHeight)

                // Move the mouse to the position first
                await mouse.move(new Point(scaledX, scaledY))

                // Perform the click
                if (button === 2) {
                    await mouse.click(Button.RIGHT)
                } else if (button === 1) {
                    await mouse.click(Button.MIDDLE)
                } else {
                    await mouse.click(Button.LEFT)
                }
            } catch (error) {
                console.error("Error clicking mouse:", error)
            }
        })

        // Mouse double click handler
        ipcMain.on("mouse-double-click", async (_, data) => {
            try {
                // Scale coordinates to actual screen size
                const { x, y, screenWidth, screenHeight } = data
                const primaryDisplay = screen.getPrimaryDisplay()
                const actualWidth = primaryDisplay.size.width
                const actualHeight = primaryDisplay.size.height

                // Calculate the scaled position
                const scaledX = Math.floor((x / screenWidth) * actualWidth)
                const scaledY = Math.floor((y / screenHeight) * actualHeight)

                // Move the mouse to the position first
                await mouse.move(new Point(scaledX, scaledY))

                // Perform double click
                await mouse.doubleClick(Button.LEFT)
            } catch (error) {
                console.error("Error double-clicking mouse:", error)
            }
        })

        // Mouse scroll handler
        ipcMain.on("mouse-scroll", async (_, data) => {
            try {
                const { deltaY } = data
                // Normalize the scroll amount
                const scrollAmount = Math.sign(deltaY) * Math.min(Math.abs(deltaY), 10)
                if (scrollAmount > 0) {
                    await mouse.scrollDown(Math.abs(scrollAmount))
                } else {
                    await mouse.scrollUp(Math.abs(scrollAmount))
                }
            } catch (error) {
                console.error("Error scrolling:", error)
            }
        })

        // Keyboard event handler with improved modifier key handling
        ipcMain.on("key-press", async (_, data) => {
            try {
                const { key, type, shift, alt, ctrl, meta } = data

                // Handle modifier keys
                if (key === "Shift" || key === "Alt" || key === "Control" || key === "Meta") {
                    const modKey = key.toLowerCase()
                    if (type === "down" && !modifierState[modKey]) {
                        modifierState[modKey] = true
                        await keyboard.pressKey(mapToNutKey(key))
                    } else if (type === "up" && modifierState[modKey]) {
                        modifierState[modKey] = false
                        await keyboard.releaseKey(mapToNutKey(key))
                    }
                    return
                }

                // Handle regular keys
                if (type === "down") {
                    // Apply modifiers if needed
                    const modifiers = []
                    if (shift) modifiers.push(Key.LeftShift)
                    if (ctrl) modifiers.push(Key.LeftControl)
                    if (alt) modifiers.push(Key.LeftAlt)
                    if (meta) modifiers.push(Key.LeftSuper)

                    // For special keys
                    const nutKey = mapToNutKey(key)
                    if (nutKey) {
                        if (modifiers.length > 0) {
                            // Press all modifiers
                            for (const mod of modifiers) {
                                await keyboard.pressKey(mod)
                            }
                            // Press and release the main key
                            await keyboard.pressKey(nutKey)
                            await keyboard.releaseKey(nutKey)
                            // Release all modifiers
                            for (const mod of modifiers.reverse()) {
                                await keyboard.releaseKey(mod)
                            }
                        } else {
                            // Just press and release the key
                            await keyboard.pressKey(nutKey)
                            await keyboard.releaseKey(nutKey)
                        }
                    }
                    // For regular character keys
                    else if (key.length === 1) {
                        await keyboard.type(key)
                    }
                }
            } catch (error) {
                console.error("Keyboard event error:", error, "for key:", data.key)
            }
        })

        // Load app
        if (isDev) {
            await mainWindow.loadURL("http://localhost:3000")
            mainWindow.webContents.openDevTools()
        } else {
            await mainWindow.loadFile(path.join(__dirname, "build", "index.html"))
        }

        console.log("Electron app started successfully")
    } catch (error) {
        console.error("Window creation failed:", error)
        app.quit()
    }
}

// Helper function to map key names to nut.js Key constants
function mapToNutKey(key) {
    const keyMap = {
        // Modifiers
        Shift: Key.LeftShift,
        Control: Key.LeftControl,
        Alt: Key.LeftAlt,
        Meta: Key.LeftSuper,

        // Special keys
        Enter: Key.Return,
        Backspace: Key.Backspace,
        Delete: Key.Delete,
        Tab: Key.Tab,
        Escape: Key.Escape,
        ArrowUp: Key.Up,
        ArrowDown: Key.Down,
        ArrowLeft: Key.Left,
        ArrowRight: Key.Right,
        Home: Key.Home,
        End: Key.End,
        PageUp: Key.PageUp,
        PageDown: Key.PageDown,
        CapsLock: Key.CapsLock,
        Insert: Key.Insert,
        Space: Key.Space,

        // Function keys
        F1: Key.F1,
        F2: Key.F2,
        F3: Key.F3,
        F4: Key.F4,
        F5: Key.F5,
        F6: Key.F6,
        F7: Key.F7,
        F8: Key.F8,
        F9: Key.F9,
        F10: Key.F10,
        F11: Key.F11,
        F12: Key.F12,
    }

    return keyMap[key]
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow()
    }
})
