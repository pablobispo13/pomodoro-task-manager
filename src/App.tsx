import { useSidebar } from "@/hooks/useSidebar"
import { TitleBar } from "./components/app/title-bar"
import { Sidebar } from "./components/app/sidebar"
import { AppLoader } from "./components/AppLoader"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PomodoroView } from "./components/pomodoro/PomodoroView"
import { usePomodoro } from "./hooks/usePomodoro"
import { FocusMode } from "./components/pomodoro/FocusMode"

export default function App() {

  const { collapsed, toggle } = useSidebar()
  const pomodoro = usePomodoro()

  const [loading, setLoading] = useState(true)
  const [focusMode, setFocusMode] = useState(false)

  useEffect(() => {

    const timer = setTimeout(() => {
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)

  }, [])

  if (loading) {
    return (
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <AppLoader />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  if (focusMode) {
    return (
      <FocusMode
        dailyFocus={pomodoro.dailyFocus}
        sessions={pomodoro.sessions}
        time={pomodoro.time}
        totalTime={pomodoro.totalTime}
        exitFocus={() => setFocusMode(false)}
      />
    )
  }

  return (
    <div className="window-surface flex flex-col h-screen">

      <TitleBar toggleSidebar={toggle} />

      <div className="flex flex-1">

        <Sidebar collapsed={collapsed} />

        <main className="flex flex-1 items-center justify-center">
          <PomodoroView
            dailyFocus={pomodoro.dailyFocus}
            sessions={pomodoro.sessions}
            cycle={pomodoro.cycle}
            mode={pomodoro.mode}
            time={pomodoro.time}
            totalTime={pomodoro.totalTime}
            running={pomodoro.running}
            start={() => {
              pomodoro.start()

              if (pomodoro.mode === "focus") {
                setFocusMode(true)
              }
            }}
            skip={pomodoro.skip}
            pause={pomodoro.pause}
            reset={pomodoro.reset}
            enterFocus={() => {
              setFocusMode(true)
              pomodoro.start()
            }}
            addTime={(time) => pomodoro.addTime(time)}
          />
        </main>

      </div>

    </div>
  )
}