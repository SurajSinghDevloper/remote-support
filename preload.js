const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
    getVideoSources: () => ipcRenderer.invoke("get-video-sources"),
    sendMouseMove: (data) => ipcRenderer.send("mouse-move", data),
    sendMouseClick: (data) => ipcRenderer.send("mouse-click", data),
    sendKeyPress: (data) => ipcRenderer.send("key-press", data),
})

// Log when preload script has executed
console.log("Preload script has been loaded")