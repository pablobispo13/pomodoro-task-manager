export { }

declare global {
  interface Window {
    windowControls: {
      minimize: () => void
      maximize: () => void
      close: () => void
      enterFocusMode: () => void
      exitFocusMode: () => void
      onMaximizeChange: (callback: (state: boolean) => void) => void
      getAutoLaunch: () => Promise<boolean>
      setAutoLaunch: (enabled: boolean) => void
      sendTimerStatus: (status: { mode: string; time: number; running: boolean }) => void
      onTrayToggleTimer: (callback: () => void) => void
    }
    notifications: {
      show: (title: string, body: string) => void
    }
  }
}
