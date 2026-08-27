// CommonJS, not ESM: Electron's "electron" module is a native binding that
// only resolves correctly through require() — with `import` (named or
// default) Node's ESM loader either throws "does not provide an export
// named ..." or silently resolves to the npm package's path-string shim
// instead of the real API, depending on the exact Electron/Node build.
// preload.cjs already worked around this the same way; main.js didn't, and
// never actually booted as a result.
const { app, BrowserWindow, ipcMain, Notification, Tray, Menu } = require("electron")
const path = require("node:path")

// "public/" is copied verbatim into "dist/" by `vite build`, so the same
// icon file lives at "dist/logo.png" once packaged.
function getIconPath() {
  return path.join(__dirname, app.isPackaged ? "../../dist/logo.png" : "../../public/logo.png")
}

// Windows silently drops toast notifications from apps without a registered
// AppUserModelID — Notification.isSupported() still returns true and .show()
// never throws, so this fails with zero errors unless you know to look for it.
// Must match the electron-builder "appId" in package.json.
if (process.platform === "win32") {
  app.setAppUserModelId("com.pablobispo.pomodorotaskmanager")
}

// Without this, every launch (double-click, Windows "abrir com o Windows"
// login item, a second desktop shortcut click, etc.) spawns its own
// independent Electron process and its own window — Electron does not
// dedupe instances on its own. requestSingleInstanceLock() makes every
// launch after the first fail immediately so it can hand off to the
// original process and quit instead of opening a second window.
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

let mainWindow = null
let tray = null
// Renderer pushes this on every tick via "timer-status" so the tray tooltip
// and context menu can reflect the running pomodoro without main owning any
// timer logic itself.
let timerStatus = { mode: "focus", time: 0, running: false }
let hasShownTrayHint = false

const MODE_LABELS = { focus: "Foco", shortBreak: "Pausa curta", longBreak: "Pausa longa" }

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    show: false,
    backgroundColor: "#0f0f0f",
    hasShadow: true,
    icon: getIconPath(),
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

  // Clicking the custom titlebar's X sends "close", which calls
  // mainWindow.close() below — that fires this "close" event before the
  // window is actually destroyed. Intercepting it here (instead of just
  // hiding in the IPC handler) also catches any other way Windows can
  // close a frameless window (e.g. right-click > "Close window" on the
  // taskbar thumbnail, Alt+F4). Real quits (tray "Sair", app update,
  // OS shutdown) go through "before-quit" first, which sets isQuitting
  // so this lets the close through instead of hiding it forever.
  mainWindow.on("close", (event) => {
    if (app.isQuitting) return
    event.preventDefault()
    mainWindow.hide()

    // Only on the very first minimize-to-tray of the session — after that
    // the user already knows, and a fresh balloon every close would be noise.
    if (!hasShownTrayHint && Notification.isSupported()) {
      hasShownTrayHint = true
      new Notification({
        title: "Pomodoro Task Manager continua rodando",
        body: "O app continua em segundo plano, na bandeja do sistema. Clique no ícone para abrir de novo."
      }).show()
    }
  })
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Abrir Pomodoro Manager",
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: "separator" },
    {
      // Mirrors the renderer's play/pause: click sends "tray-toggle-timer"
      // to the window, which owns the actual timer state and logic — main
      // only knows enough (via "timer-status" pushes) to label this menu.
      label: timerStatus.running ? "Pausar pomodoro" : "Retomar pomodoro",
      enabled: timerStatus.time > 0,
      click: () => mainWindow?.webContents.send("tray-toggle-timer")
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
}

// Called on tray creation and every time the renderer pushes a new
// "timer-status" — keeps the tooltip and the Pausar/Retomar label in sync
// with the actual timer without main tracking any of the timer logic itself.
function refreshTray() {
  if (!tray) return
  const modeLabel = MODE_LABELS[timerStatus.mode] ?? timerStatus.mode
  tray.setToolTip(
    timerStatus.running
      ? `Pomodoro Task Manager — ${modeLabel}: ${formatClock(timerStatus.time)}`
      : "Pomodoro Task Manager"
  )
  tray.setContextMenu(buildTrayMenu())
}

function createTray() {
  tray = new Tray(getIconPath())
  refreshTray()

  // Left-click on Windows opens/focuses the window (right-click already
  // opens the context menu above via setContextMenu).
  tray.on("click", () => {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.focus()
  })
}

// Fires in the FIRST instance when a second launch attempt was blocked
// above — focus/restore the existing window instead of leaving the user
// looking at whichever window already had focus.
app.on("second-instance", () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
})

// The custom titlebar's close button now hides the window instead of
// quitting (see the "close" handler in createWindow), so this is the one
// place that distinguishes an actual quit (tray "Sair", OS shutdown, app
// update) from that hide — anything that reaches here should let the
// window really close instead of being intercepted.
app.on("before-quit", () => {
  app.isQuitting = true
})

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

  ipcMain.on("timer-status", (_, status) => {
    timerStatus = status
    refreshTray()
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
  createTray()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// window-all-closed no longer fires from the X button (it now hides
// instead of destroying the window), only from an actual quit — but keep
// this as a safety net for anything that does destroy the window outright.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
