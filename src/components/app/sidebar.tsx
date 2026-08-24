import { BarChart2, CheckSquare, Settings, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type View = "pomodoro" | "tasks" | "dashboard" | "settings"

const items: { name: string; label: string; icon: React.ElementType; view: View }[] = [
  { name: "Pomodoro", label: "Pomodoro", icon: Timer, view: "pomodoro" },
  { name: "Tasks", label: "Tarefas", icon: CheckSquare, view: "tasks" },
  { name: "Dashboard", label: "Dashboard", icon: BarChart2, view: "dashboard" },
  { name: "Settings", label: "Configurações", icon: Settings, view: "settings" }
]

type Props = {
  collapsed: boolean
  activeView: View
  onNavigate: (view: View) => void
}

export function Sidebar({ collapsed, activeView, onNavigate }: Props) {
  return (
    <motion.div
      animate={{ width: collapsed ? 53 : 224 }}
      transition={{ duration: 0.2 }}
      className="border-r bg-muted/40 p-2 flex flex-col shrink-0"
    >
      {!collapsed && (
        <div className="text-xs font-medium text-muted-foreground mb-3 px-2 tracking-widest">
          MENU
        </div>
      )}

      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = activeView === item.view

          return (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "justify-start gap-2 h-9 transition-colors",
                active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
              )}
              onClick={() => onNavigate(item.view)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Button>
          )
        })}
      </div>
    </motion.div>
  )
}
