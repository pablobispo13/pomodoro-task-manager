import { useCallback, useState } from "react"

export type Column = {
  id: string
  label: string
  // Soft WIP limit — the board flags the column when it holds more tasks
  // than this, but never blocks a drop. undefined/absent means unlimited.
  wipLimit?: number
}

export const STORAGE_KEY = "kanban-columns"

// "todo"/"doing"/"done" are fixed ids used elsewhere (task completion, dashboard
// stats) — renaming a column keeps its id, so completion tracking stays correct
// even if the user renames "Concluída" to something else. Only deleting the
// "done" column would remove that semantic, which is an acceptable edge case.
const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", label: "A fazer" },
  { id: "doing", label: "Em andamento" },
  { id: "done", label: "Concluída" }
]

function load(): Column[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const parsed: Column[] = JSON.parse(s)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // corrupt entry — fall back to defaults
  }
  return DEFAULT_COLUMNS
}

function persist(columns: Column[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
}

export function useColumns() {
  const [columns, setColumns] = useState<Column[]>(load)

  const addColumn = useCallback((label: string) => {
    setColumns((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), label }]
      persist(next)
      return next
    })
  }, [])

  const renameColumn = useCallback((id: string, label: string) => {
    setColumns((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, label } : c))
      persist(next)
      return next
    })
  }, [])

  const setWipLimit = useCallback((id: string, wipLimit: number | undefined) => {
    setColumns((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, wipLimit } : c))
      persist(next)
      return next
    })
  }, [])

  // Tasks left in the removed column are the caller's responsibility to
  // reassign first (useColumns doesn't know about useTasks).
  const removeColumn = useCallback((id: string) => {
    setColumns((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((c) => c.id !== id)
      persist(next)
      return next
    })
  }, [])

  // The array's own order is the display order — moving a column just swaps
  // it with its neighbor.
  const moveColumn = useCallback((id: string, direction: "up" | "down") => {
    setColumns((prev) => {
      const index = prev.findIndex((c) => c.id === id)
      const swapWith = direction === "up" ? index - 1 : index + 1
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
      persist(next)
      return next
    })
  }, [])

  // Full reorder from a drag-and-drop drop — `orderedIds` must contain every
  // current column id exactly once. Used by the Kanban board's own column
  // drag; `moveColumn` (single-step swap) is used by the Cadastros screen.
  const reorderColumns = useCallback((orderedIds: string[]) => {
    setColumns((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]))
      const next = orderedIds.map((id) => byId.get(id)).filter((c): c is Column => c !== undefined)
      if (next.length !== prev.length) return prev
      persist(next)
      return next
    })
  }, [])

  return { columns, addColumn, renameColumn, setWipLimit, removeColumn, moveColumn, reorderColumns }
}
