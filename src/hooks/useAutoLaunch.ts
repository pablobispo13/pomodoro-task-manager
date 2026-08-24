import { useEffect, useState } from "react"
import { isElectron } from "@/utils/isElectron"

export function useAutoLaunch() {
  const supported = isElectron()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!supported) return
    window.windowControls.getAutoLaunch().then(setEnabled)
  }, [supported])

  function setAutoLaunch(value: boolean) {
    if (!supported) return
    setEnabled(value)
    window.windowControls.setAutoLaunch(value)
  }

  return { supported, enabled, setAutoLaunch }
}
