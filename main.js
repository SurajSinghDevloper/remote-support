const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron")
const { keyboard, mouse, Button, screen: nutScreen } = require("@nut-tree-fork/nut-js")
const path = require("path")

let mainWindow = null

// Configure nut.js settings
keyboard.config.autoDelayMs = 0
mouse.config.autoDelayMs = 0
mouse.config.mouseSpeed = 1000 // Faster mouse movement

async function createWindow() {
    try {
        // Configure nut.js resource directory
        const nutResources = path.join(__dirname, "node_modules", "@nut-tree-fork", "nut-js", "lib", "resources")
        nutScreen.config.resourceDirectory = nutResources

        // Create the browser window
        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, "preload.js"),
                webSecurity: false, // Important for loading remote images
                allowRunningInsecureContent: true,
            },
        })

        // Handle window closed
        mainWindow.on("closed", () => {
            mainWindow = null
        })

        // Handle screen source request
        ipcMain.handle("get-video-sources", async () => {
            try {
                const sources = await desktopCapturer.getSources({
                    types: ["screen", "window"],
                    thumbnailSize: { width: 150, height: 150 },
                })
                console.log(
                    "Available sources:",
                    sources.map((s) => s.name),
                )
                return sources
            } catch (error) {
                console.error("Error getting video sources:", error)
                return []
            }
        })

        // Handle mouse and keyboard inputs
        ipcMain.on("mouse-move", async (_, { x, y }) => {
            try {
                await mouse.move([x, y])
            } catch (error) {
                console.error("Mouse move error:", error)
            }
        })

        ipcMain.on("mouse-click", async () => {
            try {
                await mouse.click(Button.LEFT)
            } catch (error) {
                console.error("Mouse click error:", error)
            }
        })

        ipcMain.on("key-press", async (_, { key }) => {
            try {
                await keyboard.type(key)
            } catch (error) {
                console.error("Keyboard type error:", error)
            }
        })

        // Load app
        if (app.isPackaged) {
            await mainWindow.loadFile(path.join(__dirname, "build", "index.html"))
        } else {
            await mainWindow.loadURL("http://localhost:3000")
            mainWindow.webContents.openDevTools() // Open DevTools for debugging
        }

        console.log("Electron app started successfully")
    } catch (error) {
        console.error("Window creation failed:", error)
        app.quit()
    }
}

// App lifecycle
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