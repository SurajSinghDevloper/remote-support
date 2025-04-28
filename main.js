// // const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron")
// // const { keyboard, mouse, Button, screen: nutScreen } = require("@nut-tree-fork/nut-js")
// // const path = require("path")

// // let mainWindow = null

// // // Configure nut.js settings
// // keyboard.config.autoDelayMs = 0
// // mouse.config.autoDelayMs = 0
// // mouse.config.mouseSpeed = 1000 // Faster mouse movement

// // async function createWindow() {
// //     try {
// //         // Configure nut.js resource directory
// //         const nutResources = path.join(__dirname, "node_modules", "@nut-tree-fork", "nut-js", "lib", "resources")
// //         nutScreen.config.resourceDirectory = nutResources

// //         // Create the browser window
// //         mainWindow = new BrowserWindow({
// //             width: 1400,
// //             height: 900,
// //             webPreferences: {
// //                 contextIsolation: true,
// //                 nodeIntegration: false,
// //                 preload: path.join(__dirname, "preload.js"),
// //                 webSecurity: false, // Important for loading remote images
// //                 allowRunningInsecureContent: true,
// //             },
// //         })

// //         // Handle window closed
// //         mainWindow.on("closed", () => {
// //             mainWindow = null
// //         })

// //         // Handle screen source request
// //         ipcMain.handle("get-video-sources", async () => {
// //             try {
// //                 const sources = await desktopCapturer.getSources({
// //                     types: ["screen", "window"],
// //                     thumbnailSize: { width: 150, height: 150 },
// //                 })
// //                 console.log(
// //                     "Available sources:",
// //                     sources.map((s) => s.name),
// //                 )
// //                 return sources
// //             } catch (error) {
// //                 console.error("Error getting video sources:", error)
// //                 return []
// //             }
// //         })

// //         // Handle mouse and keyboard inputs
// //         ipcMain.on("mouse-move", async (_, { x, y }) => {
// //             try {
// //                 await mouse.move([x, y])
// //             } catch (error) {
// //                 console.error("Mouse move error:", error)
// //             }
// //         })

// //         ipcMain.on("mouse-click", async () => {
// //             try {
// //                 await mouse.click(Button.LEFT)
// //             } catch (error) {
// //                 console.error("Mouse click error:", error)
// //             }
// //         })

// //         ipcMain.on("key-press", async (_, { key }) => {
// //             try {
// //                 await keyboard.type(key)
// //             } catch (error) {
// //                 console.error("Keyboard type error:", error)
// //             }
// //         })

// //         // Load app
// //         if (app.isPackaged) {
// //             await mainWindow.loadFile(path.join(__dirname, "build", "index.html"))
// //         } else {
// //             await mainWindow.loadURL("http://localhost:3000")
// //             mainWindow.webContents.openDevTools() // Open DevTools for debugging
// //         }

// //         console.log("Electron app started successfully")
// //     } catch (error) {
// //         console.error("Window creation failed:", error)
// //         app.quit()
// //     }
// // }

// // // App lifecycle
// // app.whenReady().then(createWindow)

// // app.on("window-all-closed", () => {
// //     if (process.platform !== "darwin") {
// //         app.quit()
// //     }
// // })

// // app.on("activate", () => {
// //     if (mainWindow === null) {
// //         createWindow()
// //     }
// // })


// const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require("electron")
// const path = require("path")

// let mainWindow = null

// async function createWindow() {
//     try {
//         mainWindow = new BrowserWindow({
//             width: 1400,
//             height: 900,
//             webPreferences: {
//                 contextIsolation: true,
//                 nodeIntegration: false,
//                 preload: path.join(__dirname, "preload.js"),
//                 webSecurity: false,
//                 allowRunningInsecureContent: true,
//             },
//         })

//         mainWindow.on("closed", () => {
//             mainWindow = null
//         })

//         // Get screen sources handler
//         ipcMain.handle("get-video-sources", async () => {
//             try {
//                 return await desktopCapturer.getSources({
//                     types: ["screen", "window"],
//                     thumbnailSize: { width: 150, height: 150 },
//                 })
//             } catch (error) {
//                 console.error("Error getting video sources:", error)
//                 return []
//             }
//         })

//         // Enhanced input handling
//         ipcMain.on('send-input-event', (event, data) => {
//             const display = screen.getPrimaryDisplay()
//             const scaleFactor = display.scaleFactor
//             const { width, height } = display.size

//             // Convert normalized coordinates to actual screen coordinates
//             const actualX = data.x * (width / scaleFactor)
//             const actualY = data.y * (height / scaleFactor)

//             switch (data.type) {
//                 case 'mouseMove':
//                     mainWindow.webContents.sendInputEvent({
//                         type: 'mouseMove',
//                         x: actualX,
//                         y: actualY
//                     })
//                     // Broadcast cursor position to client
//                     if (mainWindow.webContents.getURL().includes('host')) {
//                         mainWindow.webContents.send('cursor-position', {
//                             x: data.x,
//                             y: data.y
//                         })
//                     }
//                     break

//                 case 'mouse-click':
//                     const buttonType = data.button === 2 ? 'right' : 'left'
//                     mainWindow.webContents.sendInputEvent({
//                         type: 'mouseDown',
//                         button: buttonType,
//                         x: actualX,
//                         y: actualY
//                     })
//                     setTimeout(() => {
//                         mainWindow.webContents.sendInputEvent({
//                             type: 'mouseUp',
//                             button: buttonType,
//                             x: actualX,
//                             y: actualY
//                         })
//                     }, 50)
//                     break
//             }
//         })

//         // Load app
//         if (app.isPackaged) {
//             await mainWindow.loadFile(path.join(__dirname, "build", "index.html"))
//         } else {
//             await mainWindow.loadURL("http://localhost:3000")
//             mainWindow.webContents.openDevTools()
//         }

//     } catch (error) {
//         console.error("Window creation failed:", error)
//         app.quit()
//     }
// }

// app.whenReady().then(createWindow)

// app.on("window-all-closed", () => {
//     if (process.platform !== "darwin") {
//         app.quit()
//     }
// })

// app.on("activate", () => {
//     if (mainWindow === null) {
//         createWindow()
//     }
// })


// // main.js
// const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require("electron")
// const path = require("path")
// const isDev = require("electron-is-dev")
// const { keyboard, mouse, Button, Point, screen: nutScreen } = require("@nut-tree-fork/nut-js")

// let mainWindow = null

// // Configure nut.js settings for better performance
// keyboard.config.autoDelayMs = 0
// mouse.config.autoDelayMs = 0
// mouse.config.mouseSpeed = 1000 // Faster mouse movement

// async function createWindow() {
//     try {
//         // Configure nut.js resource directory
//         const nutResources = path.join(__dirname, "node_modules", "@nut-tree-fork", "nut-js", "lib", "resources")
//         nutScreen.config.resourceDirectory = nutResources

//         mainWindow = new BrowserWindow({
//             width: 1400,
//             height: 900,
//             webPreferences: {
//                 contextIsolation: true,
//                 nodeIntegration: false,
//                 preload: path.join(__dirname, "preload.js"),
//                 webSecurity: false,
//                 allowRunningInsecureContent: true,
//             },
//         })

//         mainWindow.on("closed", () => {
//             mainWindow = null
//         })

//         // Get screen sources handler
//         ipcMain.handle("get-video-sources", async () => {
//             try {
//                 return await desktopCapturer.getSources({
//                     types: ["screen", "window"],
//                     thumbnailSize: { width: 150, height: 150 },
//                 })
//             } catch (error) {
//                 console.error("Error getting video sources:", error)
//                 return []
//             }
//         })

//         // Get screen size handler
//         ipcMain.handle("get-screen-size", () => {
//             const primaryDisplay = screen.getPrimaryDisplay()
//             return {
//                 width: primaryDisplay.size.width,
//                 height: primaryDisplay.size.height,
//                 scaleFactor: primaryDisplay.scaleFactor
//             }
//         })

//         // Mouse movement handler
//         ipcMain.on("mouse-move", async (_, data) => {
//             try {
//                 console.log("Mouse move:", data)

//                 // Scale coordinates to actual screen size
//                 const { x, y, screenWidth, screenHeight } = data
//                 const primaryDisplay = screen.getPrimaryDisplay()
//                 const actualWidth = primaryDisplay.size.width
//                 const actualHeight = primaryDisplay.size.height

//                 // Calculate the scaled position
//                 const scaledX = Math.floor((x / screenWidth) * actualWidth)
//                 const scaledY = Math.floor((y / screenHeight) * actualHeight)

//                 // Move the mouse to the calculated position
//                 await mouse.move(new Point(scaledX, scaledY))
//             } catch (error) {
//                 console.error("Error moving mouse:", error)
//             }
//         })

//         // Mouse click handler
//         ipcMain.on("mouse-click", async (_, data) => {
//             try {
//                 console.log("Mouse click:", data)

//                 // Scale coordinates to actual screen size
//                 const { x, y, button, screenWidth, screenHeight } = data
//                 const primaryDisplay = screen.getPrimaryDisplay()
//                 const actualWidth = primaryDisplay.size.width
//                 const actualHeight = primaryDisplay.size.height

//                 // Calculate the scaled position
//                 const scaledX = Math.floor((x / screenWidth) * actualWidth)
//                 const scaledY = Math.floor((y / screenHeight) * actualHeight)

//                 // Move the mouse to the position first
//                 await mouse.move(new Point(scaledX, scaledY))

//                 // Perform the click
//                 if (button === 2) {
//                     await mouse.click(Button.RIGHT)
//                 } else {
//                     await mouse.click(Button.LEFT)
//                 }
//             } catch (error) {
//                 console.error("Error clicking mouse:", error)
//             }
//         })

//         // Keyboard event handler
//         ipcMain.on("key-press", async (_, data) => {
//             try {
//                 console.log("Key press:", data)
//                 const { key, type } = data

//                 // Handle key press
//                 if (type === "down") {
//                     // For special keys like Enter, Escape, etc.
//                     if (key.length > 1) {
//                         switch (key) {
//                             case "Enter":
//                                 await keyboard.type("\n")
//                                 break
//                             case "Backspace":
//                                 await keyboard.pressKey("backspace")
//                                 await keyboard.releaseKey("backspace")
//                                 break
//                             case "Delete":
//                                 await keyboard.pressKey("delete")
//                                 await keyboard.releaseKey("delete")
//                                 break
//                             case "Tab":
//                                 await keyboard.pressKey("tab")
//                                 await keyboard.releaseKey("tab")
//                                 break
//                             case "Escape":
//                                 await keyboard.pressKey("escape")
//                                 await keyboard.releaseKey("escape")
//                                 break
//                             case "ArrowUp":
//                                 await keyboard.pressKey("up")
//                                 await keyboard.releaseKey("up")
//                                 break
//                             case "ArrowDown":
//                                 await keyboard.pressKey("down")
//                                 await keyboard.releaseKey("down")
//                                 break
//                             case "ArrowLeft":
//                                 await keyboard.pressKey("left")
//                                 await keyboard.releaseKey("left")
//                                 break
//                             case "ArrowRight":
//                                 await keyboard.pressKey("right")
//                                 await keyboard.releaseKey("right")
//                                 break
//                             default:
//                                 // Try to handle function keys and other special keys
//                                 if (key.startsWith("F") && !isNaN(key.substring(1))) {
//                                     const fKey = `f${key.substring(1)}`
//                                     await keyboard.pressKey(fKey)
//                                     await keyboard.releaseKey(fKey)
//                                 }
//                         }
//                     } else {
//                         // For regular character keys
//                         await keyboard.type(key)
//                     }
//                 }
//             } catch (error) {
//                 console.error("Keyboard event error:", error)
//             }
//         })

//         // Load app
//         if (isDev) {
//             await mainWindow.loadURL("http://localhost:3000")
//             mainWindow.webContents.openDevTools()
//         } else {
//             await mainWindow.loadFile(path.join(__dirname, "build", "index.html"))
//         }

//         console.log("Electron app started successfully")
//     } catch (error) {
//         console.error("Window creation failed:", error)
//         app.quit()
//     }
// }

// app.whenReady().then(createWindow)

// app.on("window-all-closed", () => {
//     if (process.platform !== "darwin") {
//         app.quit()
//     }
// })

// app.on("activate", () => {
//     if (mainWindow === null) {
//         createWindow()
//     }
// })





// main.js
// main.js
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
    meta: false
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
                scaleFactor: primaryDisplay.scaleFactor
            }
        })

        // Mouse movement handler
        ipcMain.on("mouse-move", async (_, data) => {
            try {
                // Scale coordinates to actual screen size
                const { x, y, screenWidth, screenHeight } = data
                const primaryDisplay = screen.getPrimaryDisplay()
                const actualWidth = primaryDisplay.size.width
                const actualHeight = primaryDisplay.size.height

                // Calculate the scaled position
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

        // Keyboard event handler
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
        "Shift": Key.LeftShift,
        "Control": Key.LeftControl,
        "Alt": Key.LeftAlt,
        "Meta": Key.LeftSuper,

        // Special keys
        "Enter": Key.Return,
        "Backspace": Key.Backspace,
        "Delete": Key.Delete,
        "Tab": Key.Tab,
        "Escape": Key.Escape,
        "ArrowUp": Key.Up,
        "ArrowDown": Key.Down,
        "ArrowLeft": Key.Left,
        "ArrowRight": Key.Right,
        "Home": Key.Home,
        "End": Key.End,
        "PageUp": Key.PageUp,
        "PageDown": Key.PageDown,
        "CapsLock": Key.CapsLock,
        "Insert": Key.Insert,
        "Space": Key.Space,

        // Function keys
        "F1": Key.F1,
        "F2": Key.F2,
        "F3": Key.F3,
        "F4": Key.F4,
        "F5": Key.F5,
        "F6": Key.F6,
        "F7": Key.F7,
        "F8": Key.F8,
        "F9": Key.F9,
        "F10": Key.F10,
        "F11": Key.F11,
        "F12": Key.F12,
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