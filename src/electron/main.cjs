// CommonJS, not ESM: Electron's "electron" module is a native binding that
// only resolves correctly through require() — with `import` (named or
// default) Node's ESM loader either throws "does not provide an export
// named ..." or silently resolves to the npm package's path-string shim
// instead of the real API, depending on the exact Electron/Node build.
// preload.cjs already worked around this the same way; main.js didn't, and
// never actually booted as a result.
const { app, BrowserWindow, ipcMain, Notification } = require("electron")
const path = require("node:path")

// Windows silently drops toast notifications from apps without a registered
// AppUserModelID — Notification.isSupported() still returns true and .show()
// never throws, so this fails with zero errors unless you know to look for it.
// Must match the electron-builder "appId" in package.json.
if (process.platform === "win32") {
  app.setAppUserModelId("com.pablobispo.pomodorotaskmanager")
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    show: false,
    backgroundColor: "#0f0f0f",
    hasShadow: true,
    // "public/" is copied verbatim into "dist/" by `vite build`, so the same
    // file lives at "dist/logo.png" once packaged.
    icon: path.join(__dirname, app.isPackaged ? "../../dist/logo.png" : "../../public/logo.png"),
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"))
  } else {
    mainWindow.loadURL("http://localhost:5173")
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-maximized", true)
  })

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-maximized", false)
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {

  ipcMain.on("minimize", () => {
    mainWindow?.minimize()
  })

  ipcMain.on("maximize", () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on("close", () => {
    mainWindow?.close()
  })

  ipcMain.on("enter-focus-mode", () => {
    if (!mainWindow) return
    mainWindow.setFullScreen(true)
    mainWindow.setAlwaysOnTop(true, "screen-saver")
  })

  ipcMain.on("exit-focus-mode", () => {
    if (!mainWindow) return
    mainWindow.setAlwaysOnTop(false)
    mainWindow.setFullScreen(false)
  })

  ipcMain.handle("get-auto-launch", () => app.getLoginItemSettings().openAtLogin)

  ipcMain.on("set-auto-launch", (_, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
  })

  ipcMain.on("show-notification", (_, title, body) => {
    if (!Notification.isSupported()) {
      console.warn("[notifications] Notification.isSupported() is false — OS toast will not show")
      return
    }
    new Notification({ title, body }).show()
  })

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
