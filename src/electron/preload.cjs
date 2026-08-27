const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send("minimize"),
  maximize: () => ipcRenderer.send("maximize"),
  close: () => ipcRenderer.send("close"),
  enterFocusMode: () => ipcRenderer.send("enter-focus-mode"),
  exitFocusMode: () => ipcRenderer.send("exit-focus-mode"),
  onMaximizeChange: (callback) =>
    ipcRenderer.on("window-maximized", (_, value) => callback(value)),
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  setAutoLaunch: (enabled) => ipcRenderer.send("set-auto-launch", enabled),
  sendTimerStatus: (status) => ipcRenderer.send("timer-status", status),
  onTrayToggleTimer: (callback) => ipcRenderer.on("tray-toggle-timer", () => callback())
})

contextBridge.exposeInMainWorld("notifications", {
  show: (title, body) => ipcRenderer.send("show-notification", title, body)
})
