import { isElectron } from "./isElectron"

// Platform-aware enter/exit for focus mode.
// Mirrors the dual-path approach added in the previous commit:
// Electron uses native window controls; the browser falls back to the
// Fullscreen API. The browser fullscreen *request* must be triggered
// synchronously inside a user gesture, so call requestBrowserFullscreen()
// from the click handler before mounting the FocusMode component.

export function requestBrowserFullscreen() {
  if (isElectron()) return
  if (document.fullscreenElement) return
  document.documentElement.requestFullscreen?.().catch(() => {})
}

export function enterFocusModePlatform() {
  if (isElectron()) {
    window.windowControls.enterFocusMode()
  }
  // Browser path: fullscreen was already requested by the click handler.
}

export function exitFocusModePlatform() {
  if (isElectron()) {
    window.windowControls.exitFocusMode()
    return
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  }
}

// In the browser the user can press F11/Esc to leave fullscreen at any time.
// We treat that as an implicit exit from focus mode.
export function watchBrowserFullscreenExit(onExit: () => void): () => void {
  if (isElectron()) return () => {}

  const handler = () => {
    if (!document.fullscreenElement) onExit()
  }
  document.addEventListener("fullscreenchange", handler)
  return () => document.removeEventListener("fullscreenchange", handler)
}
