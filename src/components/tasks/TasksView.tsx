import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, ChevronUp, Circle, Pencil, Plus, Target, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTime } from "@/utils/formatTime"
import type { Task, TaskPriority } from "@/hooks/useTasks"

// ─── types ───────────────────────────────────────────────────────────────────

type Filter = "all" | "active" | "completed"

type Props = {
  tasks: Task[]
  activeTaskId: string | null
  onAdd: (data: { title: string; description: string; priority: TaskPriority; estimatedPomodoros: number }) => void
  onUpdate: (id: string, data: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">>) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onSetActiveTask: (id: string | null) => void
}

// ─── priority helpers ─────────────────────────────────────────────────────────

const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

const priorityLabel: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa"
}

const priorityColor: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PomodoroTomato({ filled }: { filled: boolean }) {
  return (
    <span className={cn("text-xs", filled ? "opacity-100" : "opacity-25")}>🍅</span>
  )
}

type FormValues = {
  title: string
  description: string
  priority: TaskPriority
  estimatedPomodoros: number
}

type TaskFormProps = {
  initial?: FormValues
  onSubmit: (values: FormValues) => void
  onCancel: () => void
  submitLabel: string
}

function TaskForm({ initial, onSubmit, onCancel, submitLabel }: TaskFormProps) {
  const [values, setValues] = useState<FormValues>(
    initial ?? { title: "", description: "", priority: "medium", estimatedPomodoros: 1 }
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.title.trim()) return
    onSubmit({ ...values, title: values.title.trim(), description: values.description.trim() })
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3"
    >
      <input
        autoFocus
        type="text"
        placeholder="Título da tarefa *"
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        className="w-full bg-transparent border-b border-border pb-1 text-sm outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
      />

      <textarea
        placeholder="Descrição (opcional)"
        value={values.description}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        rows={2}
        className="w-full bg-muted/40 rounded-md px-3 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none focus:ring-1 focus:ring-primary transition-shadow"
      />

      <div className="flex gap-3 items-center">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-muted-foreground">Prioridade</label>
          <select
            value={values.priority}
            onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value as TaskPriority }))}
            className="bg-muted/40 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">🍅 Estimativa</label>
          <input
            type="number"
            min={1}
            max={20}
            value={values.estimatedPomodoros}
            onChange={(e) =>
              setValues((v) => ({ ...v, estimatedPomodoros: Math.max(1, Number(e.target.value)) }))
            }
            className="w-20 bg-muted/40 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary text-center"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!values.title.trim()}>
          {submitLabel}
        </Button>
      </div>
    </motion.form>
  )
}

type TaskItemProps = {
  task: Task
  isActive: boolean
  isEditing: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onSave: (data: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">>) => void
  onCancelEdit: () => void
  onSetActive: () => void
}

function TaskItem({
  task,
  isActive,
  isEditing,
  onToggle,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit,
  onSetActive
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false)

  const pomodoroSlots = Array.from({ length: task.estimatedPomodoros }, (_, i) => i)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "border border-border rounded-lg overflow-hidden transition-colors",
        isActive && "border-primary/50 bg-primary/5",
        task.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Complete toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            task.completed
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {task.completed && <Check size={11} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium leading-snug",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>

            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                priorityColor[task.priority]
              )}
            >
              {priorityLabel[task.priority]}
            </span>
          </div>

          {/* Pomodoro progress */}
          <div className="flex items-center gap-0.5 mt-1">
            {pomodoroSlots.map((i) => (
              <PomodoroTomato key={i} filled={i < task.completedPomodoros} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              {task.completedPomodoros}/{task.estimatedPomodoros}
            </span>
            {task.focusSeconds > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1.5">
                ⏱ {formatTime(task.focusSeconds)}
              </span>
            )}
          </div>

          {/* Description (expandable) */}
          {task.description && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? "Ocultar" : "Ver descrição"}
            </button>
          )}

          {expanded && task.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onSetActive}
            title={isActive ? "Remover tarefa ativa" : "Definir como tarefa ativa"}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              isActive
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60"
            )}
          >
            {isActive ? <Target size={14} /> : <Circle size={14} />}
          </button>

          {!task.completed && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Edit form */}
      <AnimatePresence>
        {isEditing && (
          <div className="px-3 pb-3">
            <TaskForm
              initial={{
                title: task.title,
                description: task.description,
                priority: task.priority,
                estimatedPomodoros: task.estimatedPomodoros
              }}
              onSubmit={onSave}
              onCancel={onCancelEdit}
              submitLabel="Salvar"
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function TasksView({
  tasks,
  activeTaskId,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
  onSetActiveTask
}: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const active = tasks.filter((t) => !t.completed)
  const completed = tasks.filter((t) => t.completed)

  const filtered = (() => {
    const source = filter === "active" ? active : filter === "completed" ? completed : tasks
    return [...source].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pd !== 0) return pd
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })()

  function handleAdd(values: FormValues) {
    onAdd(values)
    setShowAddForm(false)
  }

  function handleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id))
  }

  function handleSave(
    id: string,
    data: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">>
  ) {
    onUpdate(id, data)
    setEditingId(null)
  }

  const counts = { all: tasks.length, active: active.length, completed: completed.length }
  const filterLabels: Record<Filter, string> = { all: "Todas", active: "Ativas", completed: "Concluídas" }

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto w-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Tarefas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {active.length} ativa{active.length !== 1 ? "s" : ""} · {completed.length} concluída{completed.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setShowAddForm((v) => !v)
            if (editingId) setEditingId(null)
          }}
          className="gap-1.5"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? "Cancelar" : "Nova Tarefa"}
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <div className="mb-4">
            <TaskForm
              onSubmit={handleAdd}
              onCancel={() => setShowAddForm(false)}
              submitLabel="Adicionar"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-muted/40 p-1 rounded-lg self-start">
        {(["all", "active", "completed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              filter === f
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filterLabels[f]}
            <span className="ml-1 opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        <AnimatePresence mode="popLayout">
          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isActive={task.id === activeTaskId}
              isEditing={editingId === task.id}
              onToggle={() => onToggle(task.id)}
              onEdit={() => handleEdit(task.id)}
              onDelete={() => {
                onRemove(task.id)
                if (editingId === task.id) setEditingId(null)
              }}
              onSave={(data) => handleSave(task.id, data)}
              onCancelEdit={() => setEditingId(null)}
              onSetActive={() =>
                onSetActiveTask(task.id === activeTaskId ? null : task.id)
              }
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="text-4xl mb-3">
              {filter === "completed" ? "🎉" : "📋"}
            </div>
            <p className="text-sm font-medium">
              {filter === "all" && "Nenhuma tarefa ainda"}
              {filter === "active" && "Nenhuma tarefa ativa"}
              {filter === "completed" && "Nenhuma tarefa concluída"}
            </p>
            {filter === "all" && (
              <p className="text-xs mt-1">Clique em "Nova Tarefa" para começar</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
