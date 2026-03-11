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

  mainWindow.loadURL("http://localhost:5173")

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-maximized", true)
  })

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-maximized", false)
  })
}

app.whenReady().then(() => {

  ipcMain.on("minimize", () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.minimize()
  })

  ipcMain.on("maximize", () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on("close", () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.close()
  })

  ipcMain.on("enter-focus-mode", () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    win.setFullScreen(true)
    win.setAlwaysOnTop(true, "screen-saver")
  })

  ipcMain.on("exit-focus-mode", () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    win.setAlwaysOnTop(false)
    win.setFullScreen(false)
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