import { useCallback, useState } from "react"
import type { CustomFieldValue } from "./useCustomFields"

export type TaskPriority = "low" | "medium" | "high"
// A column id — "todo"/"doing"/"done" by default, but the board supports
// user-defined columns too, so this is a free-form string, not a fixed union.
export type TaskStatus = string
export type TaskKind = "pomodoro" | "meeting"

export type Subtask = {
  id: string
  title: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  description: string
  priority: TaskPriority
  estimatedPomodoros: number
  completedPomodoros: number
  focusSeconds: number
  status: TaskStatus
  order: number
  subtasks: Subtask[]
  kind: TaskKind
  customFields: Record<string, CustomFieldValue>
  createdAt: string
  completedAt?: string
}

export const STORAGE_KEY = "tasks"

function load(): Task[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    const raw: (Partial<Task> & { completed?: boolean })[] = s ? JSON.parse(s) : []
    // Migration: tasks persisted before status/order/subtasks existed don't have them —
    // derive status from the old `completed` boolean, order from array position.
    return raw.map((t, i) => ({
      id: t.id!,
      title: t.title!,
      description: t.description ?? "",
      priority: t.priority ?? "medium",
      estimatedPomodoros: t.estimatedPomodoros ?? 1,
      completedPomodoros: t.completedPomodoros ?? 0,
      focusSeconds: t.focusSeconds ?? 0,
      status: t.status ?? (t.completed ? "done" : "todo"),
      order: t.order ?? i,
      subtasks: t.subtasks ?? [],
      kind: t.kind ?? "pomodoro",
      customFields: t.customFields ?? {},
      createdAt: t.createdAt!,
      completedAt: t.completedAt
    }))
  } catch {
    return []
  }
}

function persist(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

type AddData = Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros"> &
  Partial<Pick<Task, "kind">>
type UpdateData = Partial<Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">>

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(load)

  const add = useCallback((data: AddData) => {
    const id = crypto.randomUUID()
    setTasks((prev) => {
      const next: Task[] = [
        ...prev,
        {
          ...data,
          id,
          kind: data.kind ?? "pomodoro",
          createdAt: new Date().toISOString(),
          status: "todo",
          order: prev.filter((t) => t.status === "todo").length,
          subtasks: [],
          customFields: {},
          completedPomodoros: 0,
          focusSeconds: 0
        }
      ]
      persist(next)
      return next
    })
    return id
  }, [])

  const update = useCallback((id: string, data: UpdateData) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      persist(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id)
      persist(next)
      return next
    })
  }, [])

  // Re-inserts a task exactly as it was — used to undo a `remove`. Guards
  // against double-inserting if undo is somehow triggered twice for the same task.
  const restore = useCallback((task: Task) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === task.id)) return prev
      const next = [...prev, task]
      persist(next)
      return next
    })
  }, [])

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t
        return {
          ...t,
          status,
          completedAt: status === "done" ? new Date().toISOString() : undefined
        }
      })
      persist(next)
      return next
    })
  }, [])

  // Used by the flat list view's checkbox — flips between "done" and "todo".
  const toggle = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t
        const done = t.status !== "done"
        return {
          ...t,
          status: (done ? "done" : "todo") as TaskStatus,
          completedAt: done ? new Date().toISOString() : undefined
        }
      })
      persist(next)
      return next
    })
  }, [])

  // Persists the drag-and-drop / reorder result for one column: `orderedIds`
  // is the full list of task ids in that status, in their new visual order.
  const reorderColumn = useCallback((status: TaskStatus, orderedIds: string[]) => {
    setTasks((prev) => {
      const orderById = new Map(orderedIds.map((id, i) => [id, i]))
      const next = prev.map((t) =>
        t.status === status && orderById.has(t.id) ? { ...t, order: orderById.get(t.id)! } : t
      )
      persist(next)
      return next
    })
  }, [])

  const incrementPomodoro = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t
      )
      persist(next)
      return next
    })
  }, [])

  const addFocusSeconds = useCallback((id: string, seconds: number) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, focusSeconds: t.focusSeconds + seconds } : t
      )
      persist(next)
      return next
    })
  }, [])

  const addSubtask = useCallback((taskId: string, title: string) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, { id: crypto.randomUUID(), title, done: false }] }
          : t
      )
      persist(next)
      return next
    })
  }, [])

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
            }
          : t
      )
      persist(next)
      return next
    })
  }, [])

  const removeSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
      )
      persist(next)
      return next
    })
  }, [])

  const setCustomFieldValue = useCallback((taskId: string, fieldId: string, value: CustomFieldValue) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId ? { ...t, customFields: { ...t.customFields, [fieldId]: value } } : t
      )
      persist(next)
      return next
    })
  }, [])

  // Reassigns any task sitting in `columnId` to `fallbackColumnId` — used when
  // a Kanban column is deleted, so its tasks don't end up pointing at a status
  // that no longer exists.
  const reassignColumn = useCallback((columnId: string, fallbackColumnId: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.status === columnId ? { ...t, status: fallbackColumnId } : t))
      persist(next)
      return next
    })
  }, [])

  return {
    tasks,
    add,
    update,
    remove,
    restore,
    toggle,
    setStatus,
    reorderColumn,
    incrementPomodoro,
    addFocusSeconds,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    setCustomFieldValue,
    reassignColumn
  }
}
