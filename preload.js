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

// preload.js
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
})

// Log when preload script has executed
console.log("Preload script has been loaded")