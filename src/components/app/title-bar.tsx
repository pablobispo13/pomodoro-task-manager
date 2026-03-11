import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Minus, Square, Copy, X } from "lucide-react"
import { SidebarToggle } from "./SidebarToggle"

type Props = {
    toggleSidebar: () => void
}
export function TitleBar({ toggleSidebar }: Props) {

    const [isMaximized, setIsMaximized] = useState(false)

    useEffect(() => {
        window.windowControls.onMaximizeChange((state: boolean) => {
            setIsMaximized(state)
        })
    }, [])

    return (
        <div className="drag titlebar-surface flex h-10 items-center justify-between px-3 select-none">
            <SidebarToggle toggleSidebar={toggleSidebar} />

            <div className="font-medium text-sm">
                Pomodoro Manager
            </div>

            <div className="flex gap-1">

                <Button
                    size="icon"
                    variant="ghost"
                    className="no-drag h-7 w-9"
                    onClick={() => window.windowControls.minimize()}
                >
                    <Minus size={14} />
                </Button>

                <Button
                    size="icon"
                    variant="ghost"
                    className="no-drag h-7 w-9"
                    onClick={() => window.windowControls.maximize()}
                >
                    {isMaximized ? <Copy size={14} /> : <Square size={14} />}
                </Button>

                <Button
                    size="icon"
                    variant="ghost"
                    className="no-drag h-7 w-9 hover:bg-red-500 hover:text-white"
                    onClick={() => window.windowControls.close()}
                >
                    <X size={14} />
                </Button>

            </div>

        </div>
    )
}