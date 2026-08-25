import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  GripVertical,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Plus,
  Target,
  Trash2,
  X
} from "lucide-react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { formatTime } from "@/utils/formatTime"
import type { Task, TaskPriority, TaskStatus } from "@/hooks/useTasks"
import type { Column } from "@/hooks/useColumns"
import type { CustomFieldDef, CustomFieldValue } from "@/hooks/useCustomFields"

// ─── types ───────────────────────────────────────────────────────────────────

type ViewMode = "list" | "kanban"
type Filter = "all" | "active" | "completed"

type Props = {
  tasks: Task[]
  activeTaskId: string | null
  onAdd: (data: { title: string; description: string; priority: TaskPriority; estimatedPomodoros: number }) => void
  onUpdate: (id: string, data: Partial<Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">>) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onSetStatus: (id: string, status: TaskStatus) => void
  onReorderColumn: (status: TaskStatus, orderedIds: string[]) => void
  onSetActiveTask: (id: string | null) => void
  onAddSubtask: (taskId: string, title: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onRemoveSubtask: (taskId: string, subtaskId: string) => void
  columns: Column[]
  onAddColumn: (label: string) => void
  onRenameColumn: (id: string, label: string) => void
  onSetWipLimit: (id: string, limit: number | undefined) => void
  onRemoveColumn: (id: string) => void
  onReorderColumns: (orderedIds: string[]) => void
  fields: CustomFieldDef[]
  onSetCustomField: (taskId: string, fieldId: string, value: CustomFieldValue) => void
}

// ─── priority / status helpers ─────────────────────────────────────────────────

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

function tasksInStatus(tasks: Task[], status: TaskStatus) {
  return tasks
    .filter((t) => t.status === status)
    .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
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
  // Set when the form is already inside a Dialog (which supplies its own
  // card chrome) — drops the outer border/background so it doesn't nest.
  bare?: boolean
}

function TaskForm({ initial, onSubmit, onCancel, submitLabel, bare }: TaskFormProps) {
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
      className={cn("flex flex-col gap-3", !bare && "bg-card border border-border rounded-lg p-4")}
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

function SubtaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("")

  function submit() {
    const title = value.trim()
    if (!title) return
    onAdd(title)
    setValue("")
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Adicionar subtarefa..."
        className="flex-1 bg-muted/40 rounded-md px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="p-1 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}

function CustomFieldInput({
  field,
  value,
  onChange
}: {
  field: CustomFieldDef
  value: CustomFieldValue | undefined
  onChange: (value: CustomFieldValue) => void
}) {
  if (field.type === "checkbox") {
    return (
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
          value ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary"
        )}
      >
        {value ? <Check size={8} strokeWidth={3} /> : null}
      </button>
    )
  }

  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={(value as string | number | undefined) ?? ""}
      onChange={(e) =>
        onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
      }
      className="flex-1 bg-muted/40 rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary min-w-0"
    />
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
  onAddSubtask: (title: string) => void
  onToggleSubtask: (subtaskId: string) => void
  onRemoveSubtask: (subtaskId: string) => void
  fields: CustomFieldDef[]
  onSetCustomField: (fieldId: string, value: CustomFieldValue) => void
  dragHandleProps?: { attributes: React.HTMLAttributes<HTMLButtonElement>; listeners: Record<string, unknown> | undefined }
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
  onSetActive,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  fields,
  onSetCustomField,
  dragHandleProps
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false)

  const pomodoroSlots = Array.from({ length: task.estimatedPomodoros }, (_, i) => i)
  const doneSubtasks = task.subtasks.filter((s) => s.done).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "border border-border rounded-lg overflow-hidden bg-card transition-colors",
        isActive && "border-primary/50 bg-primary/5",
        task.status === "done" && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2 p-3">
        {dragHandleProps && (
          <button
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className="mt-0.5 shrink-0 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={14} />
          </button>
        )}

        {/* Complete toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            task.status === "done"
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {task.status === "done" && <Check size={11} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium leading-snug",
                task.status === "done" && "line-through text-muted-foreground"
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
          <div className="flex items-center gap-0.5 mt-1 flex-wrap">
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
            {task.subtasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1.5">
                ✅ {doneSubtasks}/{task.subtasks.length}
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? "Ocultar detalhes" : "Detalhes"}
          </button>

          {expanded && (
            <div className="mt-1.5 flex flex-col gap-2">
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
              )}

              <div className="flex flex-col gap-1">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => onToggleSubtask(s.id)}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        s.done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 hover:border-primary"
                      )}
                    >
                      {s.done && <Check size={8} strokeWidth={3} />}
                    </button>
                    <span className={cn("text-xs flex-1", s.done && "line-through text-muted-foreground")}>
                      {s.title}
                    </span>
                    <button
                      onClick={() => onRemoveSubtask(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-opacity shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <SubtaskInput onAdd={onAddSubtask} />
              </div>

              {fields.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-border/60">
                  {fields.map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-20 shrink-0 truncate">{f.name}</span>
                      <CustomFieldInput
                        field={f}
                        value={task.customFields[f.id]}
                        onChange={(value) => onSetCustomField(f.id, value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
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

          {task.status !== "done" && (
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

// ─── kanban board ───────────────────────────────────────────────────────────

type CardHandlers = Omit<TaskItemProps, "task" | "dragHandleProps">

function SortableCard({ task, handlers }: { task: Task; handlers: CardHandlers }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // DragOverlay renders the "real" card following the cursor — this slot
    // just holds the gap open, so it goes fully invisible instead of ghosting.
    opacity: isDragging ? 0 : 1
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem task={task} dragHandleProps={{ attributes, listeners }} {...handlers} />
    </div>
  )
}

function AddColumnDialog({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="w-72 shrink-0 h-fit flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl p-3 hover:bg-muted/30 transition-colors"
      >
        <Plus size={14} /> Nova coluna
      </button>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Nova coluna</DialogTitle>
            <DialogDescription>Aparece no fim do quadro Kanban.</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Nome da coluna"
            className="w-full bg-muted/40 rounded-md px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!value.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function KanbanColumn({
  column,
  taskIds,
  tasks,
  getHandlers,
  onRename,
  onSetWipLimit,
  onRemove,
  canRemove
}: {
  column: Column
  taskIds: string[]
  tasks: Task[]
  getHandlers: (task: Task) => CardHandlers
  onRename: (label: string) => void
  onSetWipLimit: (limit: number | undefined) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: "column-" + column.id })
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: column.id })
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(column.label)
  const [editingLimit, setEditingLimit] = useState(false)
  const [limitValue, setLimitValue] = useState(column.wipLimit?.toString() ?? "")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const columnTasks = taskIds.map((id) => tasks.find((t) => t.id === id)).filter((t): t is Task => t !== undefined)
  const overLimit = column.wipLimit !== undefined && columnTasks.length > column.wipLimit

  function commitLimit() {
    const trimmed = limitValue.trim()
    if (!trimmed) {
      onSetWipLimit(undefined)
    } else {
      const n = Math.floor(Number(trimmed))
      if (Number.isFinite(n) && n > 0) onSetWipLimit(n)
      else setLimitValue(column.wipLimit?.toString() ?? "")
    }
    setEditingLimit(false)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  function commitRename() {
    const trimmed = label.trim()
    if (trimmed && trimmed !== column.label) onRename(trimmed)
    else setLabel(column.label)
    setEditing(false)
  }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className="flex flex-col w-72 shrink-0 bg-muted/30 rounded-xl p-3 gap-2 h-full"
    >
      <div className="flex items-center justify-between px-1 shrink-0 gap-1.5">
        <button
          {...attributes}
          {...listeners}
          title="Arrastar coluna"
          className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical size={13} />
        </button>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setLabel(column.label)
                setEditing(false)
              }
            }}
            className="flex-1 bg-transparent border-b border-primary text-xs font-semibold uppercase tracking-wide outline-none min-w-0"
          />
        ) : (
          <h3
            onClick={() => setEditing(true)}
            title="Clique para renomear"
            className="text-xs font-semibold text-muted-foreground tracking-wide uppercase truncate cursor-text hover:text-foreground transition-colors"
          >
            {column.label}
          </h3>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {editingLimit ? (
            <input
              autoFocus
              type="number"
              min={1}
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              onBlur={commitLimit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitLimit()
                if (e.key === "Escape") {
                  setLimitValue(column.wipLimit?.toString() ?? "")
                  setEditingLimit(false)
                }
              }}
              placeholder="∞"
              title="Limite de WIP (tarefas simultâneas nesta coluna)"
              className="w-9 bg-background rounded-full px-1 py-0.5 text-[10px] text-center outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <button
              onClick={() => setEditingLimit(true)}
              title="Clique para definir um limite de WIP"
              className={cn(
                "text-[10px] rounded-full px-1.5 py-0.5 transition-colors",
                overLimit
                  ? "bg-destructive/15 text-destructive font-semibold"
                  : "text-muted-foreground bg-muted hover:bg-muted/80"
              )}
            >
              {columnTasks.length}
              {column.wipLimit ? `/${column.wipLimit}` : ""}
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => setConfirmOpen(true)}
              title="Remover coluna"
              className="text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remover a coluna "${column.label}"?`}
        description={
          columnTasks.length > 0
            ? `${columnTasks.length} tarefa${columnTasks.length !== 1 ? "s" : ""} desta coluna ${columnTasks.length !== 1 ? "serão movidas" : "será movida"} para a primeira coluna restante.`
            : undefined
        }
        confirmLabel="Remover coluna"
        onConfirm={onRemove}
      />
      <div ref={setDroppableRef} className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task) => (
            <SortableCard key={task.id} task={task} handlers={getHandlers(task)} />
          ))}
        </SortableContext>
        {columnTasks.length === 0 && (
          <div className="text-[11px] text-muted-foreground/60 text-center py-4 border border-dashed border-border rounded-lg">
            Arraste tarefas aqui
          </div>
        )}
      </div>
    </div>
  )
}

function buildColumnMap(tasks: Task[], columns: Column[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  columns.forEach((c) => {
    map[c.id] = tasksInStatus(tasks, c.id).map((t) => t.id)
  })
  return map
}

function KanbanBoard({
  tasks,
  columns,
  onSetStatus,
  onReorderColumn,
  onAddColumn,
  onRenameColumn,
  onSetWipLimit,
  onRemoveColumn,
  onReorderColumns,
  getHandlers
}: {
  tasks: Task[]
  columns: Column[]
  onSetStatus: (id: string, status: TaskStatus) => void
  onReorderColumn: (status: TaskStatus, orderedIds: string[]) => void
  onAddColumn: (label: string) => void
  onRenameColumn: (id: string, label: string) => void
  onSetWipLimit: (id: string, limit: number | undefined) => void
  onRemoveColumn: (id: string) => void
  onReorderColumns: (orderedIds: string[]) => void
  getHandlers: (task: Task) => CardHandlers
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  // Local, optimistic column layout used only while dragging — lets a card
  // move into another column the instant you hover over it, instead of
  // waiting for drop. `null` outside a drag, so the resting layout is always
  // derived fresh from `tasks`/`columns` and can never drift from them.
  const [dragMap, setDragMap] = useState<Record<string, string[]> | null>(null)

  const columnMap = dragMap ?? buildColumnMap(tasks, columns)

  function findColumnOf(id: string): string | undefined {
    return Object.keys(columnMap).find((colId) => columnMap[colId].includes(id))
  }

  function isColumnId(id: string) {
    return columns.some((c) => c.id === id)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setDragMap(buildColumnMap(tasks, columns))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    if (isColumnId(String(active.id))) return // column order preview is handled by SortableContext itself

    const activeId = String(active.id)
    const overId = String(over.id)
    const sourceCol = findColumnOf(activeId)
    const targetCol = overId.startsWith("column-") ? overId.slice("column-".length) : findColumnOf(overId)
    if (!sourceCol || !targetCol || sourceCol === targetCol) return

    setDragMap((prev) => {
      const map = prev ?? buildColumnMap(tasks, columns)
      const sourceIds = map[sourceCol].filter((id) => id !== activeId)
      const destIds = [...map[targetCol]]
      const insertAt = overId.startsWith("column-") ? destIds.length : destIds.indexOf(overId)
      destIds.splice(insertAt === -1 ? destIds.length : insertAt, 0, activeId)
      return { ...map, [sourceCol]: sourceIds, [targetCol]: destIds }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeId = String(active.id)
    setActiveId(null)
    setDragMap(null)
    if (!over) return

    if (isColumnId(activeId)) {
      const overId = String(over.id)
      const ids = columns.map((c) => c.id)
      const oldIndex = ids.indexOf(activeId)
      const newIndex = ids.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      onReorderColumns(arrayMove(ids, oldIndex, newIndex))
      return
    }

    const finalCol = findColumnOf(activeId)
    const ids = finalCol ? columnMap[finalCol] : null
    if (!finalCol || !ids) return

    const overId = String(over.id)
    const oldIndex = ids.indexOf(activeId)
    const newIndex = overId.startsWith("column-") ? ids.length - 1 : ids.indexOf(overId)
    const reordered = oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex ? arrayMove(ids, oldIndex, newIndex) : ids

    const original = tasks.find((t) => t.id === activeId)
    if (original && original.status !== finalCol) onSetStatus(activeId, finalCol)
    onReorderColumn(finalCol, reordered)
  }

  const draggingColumn = activeId ? columns.find((c) => c.id === activeId) : undefined
  const activeTask = activeId && !draggingColumn ? tasks.find((t) => t.id === activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-3 overflow-x-auto flex-1 pb-2 items-stretch">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              taskIds={columnMap[column.id] ?? []}
              tasks={tasks}
              getHandlers={getHandlers}
              onRename={(label) => onRenameColumn(column.id, label)}
              onSetWipLimit={(limit) => onSetWipLimit(column.id, limit)}
              onRemove={() => onRemoveColumn(column.id)}
              canRemove={columns.length > 1}
            />
          ))}
          <AddColumnDialog onAdd={onAddColumn} />
        </div>
      </SortableContext>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 shadow-xl">
            <TaskItem task={activeTask} {...getHandlers(activeTask)} />
          </div>
        )}
        {draggingColumn && (
          <div className="w-72 bg-muted/60 border border-border rounded-xl p-3 shadow-xl rotate-1">
            <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              {draggingColumn.label}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
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
  onSetStatus,
  onReorderColumn,
  onSetActiveTask,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  columns,
  onAddColumn,
  onRenameColumn,
  onSetWipLimit,
  onRemoveColumn,
  onReorderColumns,
  fields,
  onSetCustomField
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban")
  const [filter, setFilter] = useState<Filter>("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Keyboard shortcut: "N" opens the new-task dialog, unless the user is
  // typing somewhere (an input/textarea/contenteditable) or it's already open.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      // Also bail if any dialog is open (e.g. a delete-confirmation) — focus may
      // be on a button inside it rather than an input, so the check above alone
      // wouldn't catch it.
      if (showAddForm || document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setShowAddForm(true)
      setEditingId(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showAddForm])

  const active = tasks.filter((t) => t.status !== "done")
  const completed = tasks.filter((t) => t.status === "done")

  const filtered = (() => {
    const source = filter === "active" ? active : filter === "completed" ? completed : tasks
    return [...source].sort((a, b) => {
      if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1
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

  function getHandlers(task: Task): CardHandlers {
    return {
      isActive: task.id === activeTaskId,
      isEditing: editingId === task.id,
      onToggle: () => onToggle(task.id),
      onEdit: () => handleEdit(task.id),
      onDelete: () => {
        onRemove(task.id)
        if (editingId === task.id) setEditingId(null)
      },
      onSave: (data) => handleSave(task.id, data),
      onCancelEdit: () => setEditingId(null),
      onSetActive: () => onSetActiveTask(task.id === activeTaskId ? null : task.id),
      onAddSubtask: (title) => onAddSubtask(task.id, title),
      onToggleSubtask: (subtaskId) => onToggleSubtask(task.id, subtaskId),
      onRemoveSubtask: (subtaskId) => onRemoveSubtask(task.id, subtaskId),
      fields,
      onSetCustomField: (fieldId, value) => onSetCustomField(task.id, fieldId, value)
    }
  }

  const counts = { all: tasks.length, active: active.length, completed: completed.length }
  const filterLabels: Record<Filter, string> = { all: "Todas", active: "Ativas", completed: "Concluídas" }

  return (
    <div className={cn("flex flex-col h-full p-6 w-full overflow-hidden", viewMode === "list" && "max-w-2xl mx-auto")}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tarefas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {active.length} ativa{active.length !== 1 ? "s" : ""} · {completed.length} concluída{completed.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              title="Lista"
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban"
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <Button
            size="sm"
            title="Atalho: N"
            onClick={() => {
              setShowAddForm(true)
              if (editingId) setEditingId(null)
            }}
            className="gap-1.5"
          >
            <Plus size={14} />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Add form */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
            bare
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Adicionar"
          />
        </DialogContent>
      </Dialog>

      {viewMode === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          columns={columns}
          onSetStatus={onSetStatus}
          onReorderColumn={onReorderColumn}
          onAddColumn={onAddColumn}
          onRenameColumn={onRenameColumn}
          onSetWipLimit={onSetWipLimit}
          onRemoveColumn={onRemoveColumn}
          onReorderColumns={onReorderColumns}
          getHandlers={getHandlers}
        />
      ) : (
        <>
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
                <TaskItem key={task.id} task={task} {...getHandlers(task)} />
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
        </>
      )}
    </div>
  )
}
