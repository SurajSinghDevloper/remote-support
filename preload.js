// const { contextBridge, ipcRenderer } = require("electron")

// // Expose protected methods that allow the renderer process to use
// // the ipcRenderer without exposing the entire object
// contextBridge.exposeInMainWorld("electronAPI", {
//     getVideoSources: () => ipcRenderer.invoke("get-video-sources"),
//     sendMouseMove: (data) => ipcRenderer.send("mouse-move", data),
//     sendMouseClick: (data) => ipcRenderer.send("mouse-click", data),
//     sendKeyPress: (data) => ipcRenderer.send("key-press", data),
// })

// // Log when preload script has executed
// console.log("Preload script has been loaded")

const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
    // Get available video sources for screen sharing
    getVideoSources: () => ipcRenderer.invoke("get-video-sources"),

    // Get screen size for proper coordinate scaling
    getScreenSize: () => ipcRenderer.invoke("get-screen-size"),

    // Send mouse movement events to main process
    sendMouseMove: (data) => ipcRenderer.send("mouse-move", data),

    // Send mouse click events to main process
    sendMouseClick: (data) => ipcRenderer.send("mouse-click", data),

    // Send keyboard events to main process
    sendKeyPress: (data) => ipcRenderer.send("key-press", data),

    // Get screen scale factor for high DPI displays
    getScreenScaleFactor: () => {
        // This is a placeholder - the actual value will be provided by the main process
        return 1
    },
})

// Listen for cursor position updates from main process
ipcRenderer.on("cursor-position-update", (_, data) => {
    // Forward the event to the window so it can be picked up by the renderer
    window.dispatchEvent(new CustomEvent("cursor-position-update", { detail: data }))
})

// Log when preload script has executed
console.log("Preload script has been loaded")
