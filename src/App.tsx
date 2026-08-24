import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { useSidebar } from "@/hooks/useSidebar"
import { usePomodoro } from "@/hooks/usePomodoro"
import { useSettings } from "@/hooks/useSettings"
import { useTasks } from "@/hooks/useTasks"
import { applyAccentColor } from "@/utils/accentColors"

import { TitleBar } from "./components/app/title-bar"
import { Sidebar, type View } from "./components/app/sidebar"
import { AppLoader } from "./components/AppLoader"
import { PomodoroView } from "./components/pomodoro/PomodoroView"
import { FocusMode } from "./components/pomodoro/FocusMode"
import { TasksView } from "./components/tasks/TasksView"
import { DashboardView } from "./components/dashboard/DashboardView"
import { SettingsView } from "./components/settings/SettingsView"
import { isElectron } from "./utils/isElectron"
import { requestBrowserFullscreen } from "./utils/focusModePlatform"
import { cn } from "./lib/utils"

export default function App() {
  const { collapsed, toggle } = useSidebar()
  const { settings, update: updateSettings, reset: resetSettings } = useSettings()
  const pomodoro = usePomodoro(settings)
  const taskStore = useTasks()

  const [loading, setLoading] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [activeView, setActiveView] = useState<View>("pomodoro")
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    applyAccentColor(settings.accentColor)
  }, [settings.accentColor])

  // Auto-exit focus mode when the timer transitions out of "focus"
  // (e.g. session ends and a break starts). Lives in the parent so the
  // FocusMode component itself doesn't need to know about its lifecycle.
  useEffect(() => {
    if (pomodoro.mode !== "focus") setFocusMode(false)
  }, [pomodoro.mode])

  // Link the active task to focus time: dailyFocus ticks up by 1 once per
  // second, but only while pomodoro is actually in "focus" mode — so every
  // change here means one more second of real focus happened.
  useEffect(() => {
    if (activeTaskId && pomodoro.mode === "focus") {
      taskStore.addFocusSeconds(activeTaskId, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.dailyFocus])

  // sessions increments once when a full focus session completes — credit
  // that pomodoro to whichever task was active. previousSessionsRef avoids
  // firing on mount or when sessions resets for a new day.
  const previousSessionsRef = useRef(pomodoro.sessions)
  useEffect(() => {
    if (pomodoro.sessions > previousSessionsRef.current && activeTaskId) {
      taskStore.incrementPomodoro(activeTaskId)
    }
    previousSessionsRef.current = pomodoro.sessions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.sessions])

  const activeTask = activeTaskId ? (taskStore.tasks.find((t) => t.id === activeTaskId) ?? null) : null

  if (loading) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <AppLoader />
        </motion.div>
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

  const electron = isElectron()

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-background text-foreground",
        electron && "window-surface rounded-xl overflow-hidden"
      )}
    >

      {electron && <TitleBar toggleSidebar={toggle} />}

      <div className="flex flex-1 overflow-hidden">

        <Sidebar
          collapsed={collapsed}
          activeView={activeView}
          onNavigate={setActiveView}
        />

        <main className="flex flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-1 items-center justify-center overflow-hidden"
            >
              {activeView === "pomodoro" && (
                <PomodoroView
                  dailyFocus={pomodoro.dailyFocus}
                  sessions={pomodoro.sessions}
                  sessionInCycle={pomodoro.sessionInCycle}
                  sessionsBeforeLongBreak={pomodoro.sessionsBeforeLongBreak}
                  mode={pomodoro.mode}
                  time={pomodoro.time}
                  totalTime={pomodoro.totalTime}
                  running={pomodoro.running}
                  activeTask={activeTask}
                  start={() => {
                    pomodoro.start()
                    if (pomodoro.mode === "focus") {
                      requestBrowserFullscreen() // must run synchronously within the click handler
                      setFocusMode(true)
                    }
                  }}
                  skip={pomodoro.skip}
                  pause={pomodoro.pause}
                  reset={pomodoro.reset}
                  enterFocus={() => {
                    requestBrowserFullscreen()
                    setFocusMode(true)
                    if (!pomodoro.running) pomodoro.start()
                  }}
                  addTime={pomodoro.addTime}
                />
              )}

              {activeView === "tasks" && (
                <TasksView
                  tasks={taskStore.tasks}
                  activeTaskId={activeTaskId}
                  onAdd={taskStore.add}
                  onUpdate={taskStore.update}
                  onRemove={(id) => {
                    taskStore.remove(id)
                    if (activeTaskId === id) setActiveTaskId(null)
                  }}
                  onToggle={taskStore.toggle}
                  onSetActiveTask={setActiveTaskId}
                />
              )}

              {activeView === "dashboard" && (
                <DashboardView
                  sessions={pomodoro.sessions}
                  dailyFocus={pomodoro.dailyFocus}
                  deepFocus={pomodoro.deepFocus}
                  tasks={taskStore.tasks}
                />
              )}

              {activeView === "settings" && (
                <SettingsView
                  settings={settings}
                  onUpdate={updateSettings}
                  onReset={resetSettings}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

    </div>
  )
}
