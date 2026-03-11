import { Home, Timer, CheckSquare, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const items = [
  { name: "Tasks", icon: CheckSquare },
  { name: "Pomodoro", icon: Timer },
  { name: "Dashboard", icon: Home },
  { name: "Settings", icon: Settings }
]

type Props = {
  collapsed: boolean
}

export function Sidebar({ collapsed }: Props) {

  return (
    <motion.div
      animate={{ width: collapsed ? 53 : 224 }}
      transition={{ duration: 0.2 }}
      className="border-r bg-muted/40 p-2 flex flex-col"
    >

      <div className="text-xs font-medium text-muted-foreground mb-3 px-2">
        {!collapsed && "MENU"}
      </div>

      <div className="flex flex-col gap-1">

        {items.map((item) => {

          const Icon = item.icon

          return (
            <Button
              key={item.name}
              variant="ghost"
              className="justify-start gap-2 h-9"
            >
              <Icon size={18} />

              {!collapsed && item.name}

            </Button>
          )
        })}

      </div>

    </motion.div>
  )
}