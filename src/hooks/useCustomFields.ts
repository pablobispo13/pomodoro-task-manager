import { useCallback, useState } from "react"

export type CustomFieldType = "text" | "number" | "date" | "checkbox"

export type CustomFieldDef = {
  id: string
  name: string
  type: CustomFieldType
}

export type CustomFieldValue = string | number | boolean

export const STORAGE_KEY = "custom-fields"

function load(): CustomFieldDef[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : []
  } catch {
    return []
  }
}

function persist(defs: CustomFieldDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defs))
}

export function useCustomFields() {
  const [fields, setFields] = useState<CustomFieldDef[]>(load)

  const addField = useCallback((name: string, type: CustomFieldType) => {
    setFields((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), name, type }]
      persist(next)
      return next
    })
  }, [])

  const removeField = useCallback((id: string) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { fields, addField, removeField }
}
