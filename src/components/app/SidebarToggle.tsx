import { PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
    toggleSidebar: () => void
}

export function SidebarToggle({ toggleSidebar }: Props) {

    return (
        <Button
            size="icon"
            variant="ghost"
            className="no-drag"
            onClick={toggleSidebar}
        >
            <PanelLeft/>
        </Button>
    )
}