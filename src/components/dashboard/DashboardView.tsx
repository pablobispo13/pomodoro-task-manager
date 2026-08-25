import { Download } from "lucide-react"
import { formatTime } from "@/utils/formatTime"
import { loadDailyStats } from "@/utils/dailyStats"
import { exportDailyStatsCSV, exportDailyStatsJSON, exportTasksCSV, exportTasksJSON } from "@/utils/exportData"
import type { Task } from "@/hooks/useTasks"
import type { CustomFieldDef } from "@/hooks/useCustomFields"

type Props = {
  sessions: number
  dailyFocus: number
  deepFocus: number
  tasks: Task[]
  fields: CustomFieldDef[]
}

function getLastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      <Download size={12} />
      {label}
    </button>
  )
}

export function DashboardView({ sessions, dailyFocus, deepFocus, tasks, fields }: Props) {
  const days = getLastNDays(7)
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const

  const statsMap = loadDailyStats()
  const weekData = days.map((key) => {
    const stats = statsMap[key]
    return { key, focusMin: Math.round((stats?.focusSeconds ?? 0) / 60), sessions: stats?.sessions ?? 0 }
  })

  const maxFocusMin = Math.max(...weekData.map((d) => d.focusMin), 1)

  // Meetings are timesheet entries, not pomodoro work — keep them out of the
  // task completion/estimate stats below, they get their own section.
  const pomodoroTasks = tasks.filter((t) => t.kind === "pomodoro")
  const meetings = tasks
    .filter((t) => t.kind === "meeting")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const completedTasks = pomodoroTasks.filter((t) => t.status === "done")
  const activeTasks = pomodoroTasks.filter((t) => t.status !== "done")
  const completionRate =
    pomodoroTasks.length > 0 ? Math.round((completedTasks.length / pomodoroTasks.length) * 100) : 0

  const totalPomodorosEstimated = pomodoroTasks.reduce((s, t) => s + t.estimatedPomodoros, 0)
  const totalPomodorosDone = pomodoroTasks.reduce((s, t) => s + t.completedPomodoros, 0)
  const totalMeetingSeconds = meetings.reduce((s, t) => s + t.focusSeconds, 0)

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto w-full overflow-y-auto gap-6">

      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Resumo do seu progresso</p>
      </div>

      {/* Today stats */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">HOJE</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Sessões" value={String(sessions)} sub="pomodoros completos" />
          <StatCard label="Tempo de foco" value={formatTime(dailyFocus)} sub="hh:mm:ss" />
          <StatCard
            label="Foco profundo"
            value={formatTime(deepFocus)}
            sub="sessões ≥ 15 min"
          />
        </div>
      </section>

      {/* Weekly bar chart */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">
          ÚLTIMOS 7 DIAS
        </h2>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-end gap-2 h-24">
            {weekData.map((d) => {
              const date = new Date(d.key + "T12:00:00")
              const label = dayLabels[date.getDay()]
              const isToday = d.key === new Date().toISOString().slice(0, 10)
              const height = d.focusMin > 0 ? Math.max(8, (d.focusMin / maxFocusMin) * 80) : 4

              return (
                <div key={d.key} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {d.focusMin > 0 ? `${d.focusMin}m` : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${height}px`,
                      background: isToday
                        ? "var(--primary)"
                        : d.focusMin > 0
                          ? "color-mix(in oklch, var(--primary) 40%, transparent)"
                          : "var(--muted)"
                    }}
                  />
                  <span
                    className={`text-[10px] ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-4 mt-3 pt-3 border-t border-border">
            {weekData.map((d) => (
              <div key={d.key} className="flex-1 text-center">
                {d.sessions > 0 && (
                  <span className="text-[10px] text-muted-foreground">{d.sessions}🍅</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tasks overview */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">TAREFAS</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Taxa de conclusão"
            value={`${completionRate}%`}
            sub={`${completedTasks.length} de ${pomodoroTasks.length} concluídas`}
          />
          <StatCard
            label="Pomodoros de tarefas"
            value={`${totalPomodorosDone}/${totalPomodorosEstimated}`}
            sub="realizados / estimados"
          />
        </div>

        {activeTasks.length > 0 && (
          <div className="mt-3 bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              TAREFAS PENDENTES ({activeTasks.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {activeTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      t.priority === "high"
                        ? "bg-red-500"
                        : t.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-sky-500"
                    }`}
                  />
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    🍅 {t.completedPomodoros}/{t.estimatedPomodoros}
                    {t.focusSeconds > 0 && <> · ⏱ {formatTime(t.focusSeconds)}</>}
                  </span>
                </div>
              ))}
              {activeTasks.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{activeTasks.length - 5} mais...
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Timesheet (meetings) — separate from pomodoro session tracking */}
      {meetings.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">TIMESHEET</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatCard label="Reuniões" value={String(meetings.length)} sub="registradas" />
            <StatCard label="Tempo total" value={formatTime(totalMeetingSeconds)} sub="hh:mm:ss" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col gap-1.5">
              {meetings.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
                  <span className="truncate">{m.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    ⏱ {formatTime(m.focusSeconds)}
                    {m.status === "doing" && <> · em andamento</>}
                  </span>
                </div>
              ))}
              {meetings.length > 5 && (
                <p className="text-xs text-muted-foreground mt-1">+{meetings.length - 5} mais...</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Export */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">EXPORTAR DADOS</h2>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm">Estatísticas diárias</span>
            <div className="flex gap-2">
              <ExportButton label="CSV" onClick={() => exportDailyStatsCSV(statsMap)} />
              <ExportButton label="JSON" onClick={() => exportDailyStatsJSON(statsMap)} />
            </div>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm">Tarefas</span>
            <div className="flex gap-2">
              <ExportButton label="CSV" onClick={() => exportTasksCSV(tasks, fields)} />
              <ExportButton label="JSON" onClick={() => exportTasksJSON(tasks)} />
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
