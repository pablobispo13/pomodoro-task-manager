import { useEffect, useState } from "react"

export function useSidebar() {
    const [collapsed, setCollapsed] = useState(false)

    const toggle = () => setCollapsed((v) => !v)

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {

            const isMac = navigator.platform.toUpperCase().includes("MAC")

            if (
                (isMac && e.metaKey && e.key === "b") ||
                (!isMac && e.ctrlKey && e.key === "b")
            ) {
                e.preventDefault()
                toggle()
            }
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)

    }, [])

    return {
        collapsed,
        toggle
    }
}