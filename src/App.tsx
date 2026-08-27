import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { useSidebar } from "@/hooks/useSidebar"
import { usePomodoro, type Mode } from "@/hooks/usePomodoro"
import { useSettings } from "@/hooks/useSettings"
import { useTasks, type Task } from "@/hooks/useTasks"
import { useMeetingTimer } from "@/hooks/useMeetingTimer"
import { useColumns } from "@/hooks/useColumns"
import { useCustomFields } from "@/hooks/useCustomFields"
import { applyAccentColor } from "@/utils/accentColors"
import { notifyPhaseChange, requestNotificationPermission } from "@/utils/notify"
import { importAllData } from "@/utils/backup"

import { TitleBar } from "./components/app/title-bar"
import { Sidebar, type View } from "./components/app/sidebar"
import { PhaseAlert } from "./components/app/PhaseAlert"
import { UndoToast } from "./components/app/UndoToast"
import { ImportDropOverlay } from "./components/app/ImportDropOverlay"
import { AppLoader } from "./components/AppLoader"
import { PomodoroView } from "./components/pomodoro/PomodoroView"
import { FocusMode } from "./components/pomodoro/FocusMode"
import { TasksView } from "./components/tasks/TasksView"
import { DashboardView } from "./components/dashboard/DashboardView"
import { RegistryView } from "./components/registry/RegistryView"
import { SettingsView } from "./components/settings/SettingsView"
import { isElectron } from "./utils/isElectron"
import { requestBrowserFullscreen } from "./utils/focusModePlatform"
import { cn } from "./lib/utils"

const PHASE_MESSAGES: Record<Mode, { title: string; body: string }> = {
  focus: { title: "Hora de focar", body: "Sua sessão de foco começou." },
  shortBreak: { title: "Pausa curta", body: "Hora de descansar um pouco." },
  longBreak: { title: "Pausa longa", body: "Você merece um descanso maior." }
}

export default function App() {
  const { collapsed, toggle } = useSidebar()
  const { settings, update: updateSettings, reset: resetSettings } = useSettings()
  const pomodoro = usePomodoro(settings)
  const taskStore = useTasks()
  const meetingTimer = useMeetingTimer()
  const columnStore = useColumns()
  const fieldStore = useCustomFields()

  const [loading, setLoading] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [activeView, setActiveView] = useState<View>("pomodoro")
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [meetingTaskId, setMeetingTaskId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null)
  const [undo, setUndo] = useState<{ task: Task; message: string } | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragCounterRef = useRef(0)

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

  // Notify on every real phase transition (focus -> break -> focus), skipping
  // the initial mount. previousModeRef mirrors the previousSessionsRef pattern below.
  const previousModeRef = useRef(pomodoro.mode)
  useEffect(() => {
    if (previousModeRef.current !== pomodoro.mode && settings.notificationsEnabled) {
      const msg = PHASE_MESSAGES[pomodoro.mode]
      notifyPhaseChange(msg.title, msg.body)
      // On-screen alert too — mainly for the web version, where the OS
      // notification depends on a browser permission that may never be granted.
      if (!isElectron()) setToast(msg)
    }
    previousModeRef.current = pomodoro.mode
  }, [pomodoro.mode, settings.notificationsEnabled])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!undo) return
    const timer = setTimeout(() => setUndo(null), 6000)
    return () => clearTimeout(timer)
  }, [undo])

  // Keeps the tray tooltip/menu (main process) showing the current phase and
  // time left — pushed on every tick, mirroring how the interval in
  // usePomodoro already updates `time` once per second while running.
  useEffect(() => {
    if (!isElectron()) return
    window.windowControls.sendTimerStatus({
      mode: pomodoro.mode,
      time: pomodoro.time,
      running: pomodoro.running
    })
  }, [pomodoro.mode, pomodoro.time, pomodoro.running])

  // "Pausar/Retomar pomodoro" in the tray context menu sends this instead of
  // owning any timer state itself — pomodoroRef sidesteps the stale-closure
  // issue since this listener is registered once on mount.
  const pomodoroRef = useRef(pomodoro)
  useEffect(() => {
    pomodoroRef.current = pomodoro
  })
  useEffect(() => {
    if (!isElectron()) return
    window.windowControls.onTrayToggleTimer(() => {
      const p = pomodoroRef.current
      if (p.running) p.pause()
      else p.start()
    })
  }, [])

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

  // Meeting stopwatch: same one-tick-equals-one-second-of-real-time pattern as
  // the pomodoro focus effect above, but independent of the focus/break cycle.
  useEffect(() => {
    if (meetingTaskId && meetingTimer.running) {
      taskStore.addFocusSeconds(meetingTaskId, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingTimer.elapsed])

  function startMeeting() {
    const title = `Reunião ${new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })}`
    const id = taskStore.add({ title, description: "", priority: "medium", estimatedPomodoros: 0, kind: "meeting" })
    taskStore.setStatus(id, "doing")
    setMeetingTaskId(id)
    meetingTimer.start()
  }

  function stopMeeting() {
    meetingTimer.stop()
    if (meetingTaskId) taskStore.setStatus(meetingTaskId, "done")
    setMeetingTaskId(null)
  }

  // Move any task sitting in the column being deleted to the first remaining
  // one, so nothing ends up pointing at a status that no longer exists.
  function removeColumn(columnId: string) {
    const fallback = columnStore.columns.find((c) => c.id !== columnId)
    if (!fallback) return
    taskStore.reassignColumn(columnId, fallback.id)
    columnStore.removeColumn(columnId)
  }

  // Drag a backup .json file anywhere onto the window to import it — an
  // alternative to the file picker in Configurações → Dados. The counter
  // ref avoids the enter/leave flicker that bubbling through child elements
  // would otherwise cause.
  function handleDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    dragCounterRef.current++
    setIsDraggingFile(true)
  }

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) setIsDraggingFile(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDraggingFile(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = importAllData(String(reader.result))
      if (result.ok) {
        setToast({ title: "Backup importado", body: "Recarregando o app..." })
        setTimeout(() => window.location.reload(), 800)
      } else {
        setToast({ title: "Falha ao importar backup", body: result.error })
      }
    }
    reader.onerror = () => setToast({ title: "Falha ao importar backup", body: "Não foi possível ler o arquivo." })
    reader.readAsText(file)
  }

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
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <PhaseAlert message={toast} />
        <ImportDropOverlay active={isDraggingFile} />
        <FocusMode
          dailyFocus={pomodoro.dailyFocus}
          sessions={pomodoro.sessions}
          time={pomodoro.time}
          totalTime={pomodoro.totalTime}
          exitFocus={() => setFocusMode(false)}
        />
      </div>
    )
  }

  const electron = isElectron()

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-background text-foreground",
        electron && "window-surface rounded-xl overflow-hidden"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      <PhaseAlert message={toast} />
      <UndoToast
        message={undo?.message ?? null}
        onUndo={() => {
          if (undo) taskStore.restore(undo.task)
          setUndo(null)
        }}
      />
      <ImportDropOverlay active={isDraggingFile} />

      {electron && <TitleBar toggleSidebar={toggle} />}

      <div className="flex flex-1 overflow-hidden">

        <Sidebar
          collapsed={collapsed}
          activeView={activeView}
          onNavigate={setActiveView}
          meeting={{
            running: meetingTimer.running,
            elapsed: meetingTimer.elapsed,
            onStart: startMeeting,
            onStop: stopMeeting
          }}
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
                    if (settings.notificationsEnabled) requestNotificationPermission()
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
                    const removed = taskStore.tasks.find((t) => t.id === id)
                    taskStore.remove(id)
                    if (activeTaskId === id) setActiveTaskId(null)
                    if (removed) setUndo({ task: removed, message: `Tarefa "${removed.title}" excluída` })
                  }}
                  onToggle={taskStore.toggle}
                  onSetStatus={taskStore.setStatus}
                  onReorderColumn={taskStore.reorderColumn}
                  onSetActiveTask={setActiveTaskId}
                  onAddSubtask={taskStore.addSubtask}
                  onToggleSubtask={taskStore.toggleSubtask}
                  onRemoveSubtask={taskStore.removeSubtask}
                  columns={columnStore.columns}
                  onAddColumn={columnStore.addColumn}
                  onRenameColumn={columnStore.renameColumn}
                  onSetWipLimit={columnStore.setWipLimit}
                  onRemoveColumn={removeColumn}
                  onReorderColumns={columnStore.reorderColumns}
                  fields={fieldStore.fields}
                  onSetCustomField={taskStore.setCustomFieldValue}
                />
              )}

              {activeView === "dashboard" && (
                <DashboardView
                  sessions={pomodoro.sessions}
                  dailyFocus={pomodoro.dailyFocus}
                  deepFocus={pomodoro.deepFocus}
                  tasks={taskStore.tasks}
                  fields={fieldStore.fields}
                />
              )}

              {activeView === "registry" && (
                <RegistryView
                  columns={columnStore.columns}
                  onAddColumn={columnStore.addColumn}
                  onRenameColumn={columnStore.renameColumn}
                  onSetWipLimit={columnStore.setWipLimit}
                  onRemoveColumn={removeColumn}
                  onMoveColumn={columnStore.moveColumn}
                  fields={fieldStore.fields}
                  onAddField={fieldStore.addField}
                  onRemoveField={fieldStore.removeField}
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
