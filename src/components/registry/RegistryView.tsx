import { useState } from "react"
import { ChevronDown, ChevronUp, LayoutList, Pencil, Plus, SlidersHorizontal, X } from "lucide-react"
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
import type { Column } from "@/hooks/useColumns"
import type { CustomFieldDef, CustomFieldType } from "@/hooks/useCustomFields"

type Props = {
  columns: Column[]
  onAddColumn: (label: string) => void
  onRenameColumn: (id: string, label: string) => void
  onSetWipLimit: (id: string, limit: number | undefined) => void
  onRemoveColumn: (id: string) => void
  onMoveColumn: (id: string, direction: "up" | "down") => void
  fields: CustomFieldDef[]
  onAddField: (name: string, type: CustomFieldType) => void
  onRemoveField: (id: string) => void
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-primary shrink-0" />
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{children}</h2>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground py-2">{label}</p>
}

// ─── columns ─────────────────────────────────────────────────────────────────

function ColumnRow({
  column,
  index,
  total,
  canRemove,
  onRename,
  onSetWipLimit,
  onRemove,
  onMove
}: {
  column: Column
  index: number
  total: number
  canRemove: boolean
  onRename: (label: string) => void
  onSetWipLimit: (limit: number | undefined) => void
  onRemove: () => void
  onMove: (direction: "up" | "down") => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(column.label)
  const [limitInput, setLimitInput] = useState(column.wipLimit?.toString() ?? "")
  const [confirmOpen, setConfirmOpen] = useState(false)

  function commit() {
    const trimmed = label.trim()
    if (trimmed && trimmed !== column.label) onRename(trimmed)
    else setLabel(column.label)
    setEditing(false)
  }

  function commitLimit() {
    const trimmed = limitInput.trim()
    if (!trimmed) {
      onSetWipLimit(undefined)
      return
    }
    const n = Math.floor(Number(trimmed))
    if (Number.isFinite(n) && n > 0) onSetWipLimit(n)
    else setLimitInput(column.wipLimit?.toString() ?? "")
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex flex-col shrink-0">
        <button
          onClick={() => onMove("up")}
          disabled={index === 0}
          title="Mover para cima"
          className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground/50 transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => onMove("down")}
          disabled={index === total - 1}
          title="Mover para baixo"
          className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground/50 transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setLabel(column.label)
              setEditing(false)
            }
          }}
          className="flex-1 bg-muted/40 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary min-w-0"
        />
      ) : (
        <span className="flex-1 text-sm truncate">{column.label}</span>
      )}

      <input
        type="number"
        min={1}
        value={limitInput}
        onChange={(e) => setLimitInput(e.target.value)}
        onBlur={commitLimit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          if (e.key === "Escape") setLimitInput(column.wipLimit?.toString() ?? "")
        }}
        placeholder="∞"
        title="Limite de WIP (tarefas simultâneas nesta coluna)"
        className="w-12 shrink-0 bg-muted/40 rounded-md px-1.5 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
      />

      <button
        onClick={() => setEditing(true)}
        title="Renomear"
        className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-colors shrink-0"
      >
        <Pencil size={13} />
      </button>

      {canRemove && (
        <button
          onClick={() => setConfirmOpen(true)}
          title="Remover coluna"
          className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <X size={13} />
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remover a coluna "${column.label}"?`}
        description="As tarefas desta coluna serão movidas para a primeira coluna restante."
        confirmLabel="Remover coluna"
        onConfirm={onRemove}
      />
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
      <Button size="sm" variant="outline" className="gap-1.5 self-start" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Nova coluna
      </Button>
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

// ─── custom fields ───────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  checkbox: "Sim/Não"
}

function AddFieldDialog({ onAdd }: { onAdd: (name: string, type: CustomFieldType) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<CustomFieldType>("text")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, type)
    setName("")
    setType("text")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="gap-1.5 self-start" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Novo campo
      </Button>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Novo campo personalizado</DialogTitle>
            <DialogDescription>Aparece em "Detalhes" de toda tarefa, no Kanban e na lista.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do campo"
              className="w-full bg-muted/40 rounded-md px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomFieldType)}
                className="bg-muted/40 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function RegistryView({
  columns,
  onAddColumn,
  onRenameColumn,
  onSetWipLimit,
  onRemoveColumn,
  onMoveColumn,
  fields,
  onAddField,
  onRemoveField
}: Props) {
  return (
    <div className="flex flex-col h-full p-6 max-w-xl mx-auto w-full overflow-y-auto gap-5">

      <div>
        <h1 className="text-xl font-semibold">Cadastros</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Colunas do Kanban e campos personalizados usados nas tarefas
        </p>
      </div>

      {/* ── Colunas ───────────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
        <SectionTitle icon={LayoutList}>Colunas do Kanban</SectionTitle>

        <div className="flex flex-col divide-y divide-border">
          {columns.length === 0 && <EmptyRow label="Nenhuma coluna cadastrada." />}
          {columns.map((column, i) => (
            <ColumnRow
              key={column.id}
              column={column}
              index={i}
              total={columns.length}
              canRemove={columns.length > 1}
              onRename={(label) => onRenameColumn(column.id, label)}
              onSetWipLimit={(limit) => onSetWipLimit(column.id, limit)}
              onRemove={() => onRemoveColumn(column.id)}
              onMove={(direction) => onMoveColumn(column.id, direction)}
            />
          ))}
        </div>

        <AddColumnDialog onAdd={onAddColumn} />
      </section>

      {/* ── Campos personalizados ─────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
        <SectionTitle icon={SlidersHorizontal}>Campos personalizados</SectionTitle>

        <div className="flex flex-col divide-y divide-border">
          {fields.length === 0 && <EmptyRow label="Nenhum campo cadastrado." />}
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-sm truncate">{f.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0">
                {FIELD_TYPE_LABELS[f.type]}
              </span>
              <button
                onClick={() => onRemoveField(f.id)}
                title="Remover campo"
                className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <AddFieldDialog onAdd={onAddField} />
      </section>

    </div>
  )
}
