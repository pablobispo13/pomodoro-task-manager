import { AnimatePresence, motion } from "framer-motion"
import { Bell } from "lucide-react"

type Props = {
  message: { title: string; body: string } | null
}

// On-screen alert shown alongside (or instead of) the OS notification — mainly
// for the web version, where Notification permission may be denied or never
// granted, so this is the one alert a user is guaranteed to actually see.
export function PhaseAlert({ message }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -16, x: "-50%" }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 left-1/2 z-50 flex items-center gap-3 max-w-sm bg-card border border-border shadow-lg rounded-xl px-4 py-3"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{message.title}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{message.body}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
