import { isElectron } from "./isElectron"

// Browsers only honor Notification.requestPermission() reliably when it's
// called synchronously from a real user gesture (a click). Calling it from a
// timer-driven effect (e.g. on pomodoro phase change) gets silently ignored
// by Chrome — the prompt never shows and permission stays "default" forever.
// So permission must be requested from an actual click handler (the
// notifications toggle in Settings), never from the phase-change effect.
export async function requestNotificationPermission() {
  if (isElectron() || !("Notification" in window)) return
  if (Notification.permission === "default") {
    await Notification.requestPermission()
  }
}

export function notifyPhaseChange(title: string, body: string) {
  if (isElectron()) {
    window.notifications.show(title, body)
    return
  }

  if (!("Notification" in window)) return
  if (Notification.permission === "granted") {
    new Notification(title, { body })
  }
}
