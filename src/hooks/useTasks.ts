import { useCallback, useState } from "react"

export type TaskPriority = "low" | "medium" | "high"

export type Task = {
  id: string
  title: string
  description: string
  priority: TaskPriority
  estimatedPomodoros: number
  completedPomodoros: number
  focusSeconds: number
  completed: boolean
  createdAt: string
  completedAt?: string
}

const STORAGE_KEY = "tasks"

function load(): Task[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    const tasks: Task[] = s ? JSON.parse(s) : []
    // Migration: tasks persisted before focusSeconds existed don't have it.
    return tasks.map((t) => ({ ...t, focusSeconds: t.focusSeconds ?? 0 }))
  } catch {
    return []
  }
}

function persist(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

type AddData = Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">
type UpdateData = Partial<Pick<Task, "title" | "description" | "priority" | "estimatedPomodoros">>

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(load)

  const add = useCallback((data: AddData) => {
    setTasks((prev) => {
      const next: Task[] = [
        ...prev,
        {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          completed: false,
          completedPomodoros: 0,
          focusSeconds: 0
        }
      ]
      persist(next)
      return next
    })
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

  const toggle = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t
        const completed = !t.completed
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined
        }
      })
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

  return { tasks, add, update, remove, toggle, incrementPomodoro, addFocusSeconds }
}
