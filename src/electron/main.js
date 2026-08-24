import { app, BrowserWindow, ipcMain } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
