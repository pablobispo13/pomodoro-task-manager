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
    }
  }
}
