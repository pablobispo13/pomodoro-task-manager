import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"

type Props = {
  message: string | null
  onUndo: () => void
}

// Bottom-center toast for reversible actions (currently: task deletion) —
// kept separate from PhaseAlert (top-center, no action) since this one needs
// a button and a different lifetime than the pomodoro phase notifications.
export function UndoToast({ message, onUndo }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-1/2 z-50 flex items-center gap-1 max-w-sm bg-card border border-border shadow-lg rounded-xl pl-4 pr-2 py-2"
        >
          <p className="text-sm min-w-0 truncate">{message}</p>
          <Button size="sm" variant="ghost" className="shrink-0" onClick={onUndo}>
            Desfazer
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
