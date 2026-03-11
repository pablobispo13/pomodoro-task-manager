const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("windowControls", {
    minimize: () => ipcRenderer.send("minimize"),
    maximize: () => ipcRenderer.send("maximize"),
    close: () => ipcRenderer.send("close"),
    enterFocusMode: () => ipcRenderer.send("enter-focus-mode"),
    exitFocusMode: () => ipcRenderer.send("exit-focus-mode"),
    onMaximizeChange: (callback) =>
        ipcRenderer.on("window-maximized", (_, value) => callback(value))
})