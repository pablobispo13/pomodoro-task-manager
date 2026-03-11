export { }

declare global {
  interface Window {
    media: {
      getCurrent: () => Promise<{
        title: string
        artist: string
        album: string
        playing: boolean
      } | null>
    }
    windowControls: {
      minimize: () => void
      maximize: () => void
      close: () => void
      enterFocusMode: () => void
      exitFocusMode: () => void
      onMaximizeChange: (callback: (state: boolean) => void) => void
    }
  }
}