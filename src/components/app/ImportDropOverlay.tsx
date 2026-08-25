import { AnimatePresence, motion } from "framer-motion"
import { UploadCloud } from "lucide-react"

export function ImportDropOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-sm flex items-center justify-center pointer-events-none"
        >
          <div className="flex flex-col items-center gap-3 border-2 border-dashed border-primary rounded-2xl px-12 py-10">
            <UploadCloud size={40} className="text-primary" />
            <p className="text-base font-medium">Solte o backup aqui para importar</p>
            <p className="text-xs text-muted-foreground">Arquivo .json exportado pelo app</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
