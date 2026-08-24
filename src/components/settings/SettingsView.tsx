import { DEFAULT_SETTINGS, type PomodoroSettings } from "@/hooks/useSettings"
import { useAutoLaunch } from "@/hooks/useAutoLaunch"
import { ACCENT_COLORS, type AccentColor } from "@/utils/accentColors"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun, Monitor, Timer, Palette, Check, Power } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  settings: PomodoroSettings
  onUpdate: (partial: Partial<PomodoroSettings>) => void
  onReset: () => void
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-primary shrink-0" />
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {children}
      </h2>
    </div>
  )
}

function SliderField({
  label,
  description,
  value,
  min,
  max,
  unit,
  onChange
}: {
  label: string
  description?: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{label}</label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-sm font-mono font-bold tabular-nums text-primary min-w-[52px] text-right">
          {value}<span className="text-muted-foreground font-normal text-xs ml-0.5">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--primary) ${pct}%, color-mix(in oklch, var(--muted-foreground) 25%, transparent) ${pct}%)`
        }}
        className="w-full"
      />
    </div>
  )
}

function ToggleField({
  label,
  description,
  value,
  onChange
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

const themeOptions = [
  { value: "light" as const, label: "Claro", icon: Sun },
  { value: "dark" as const, label: "Escuro", icon: Moon },
  { value: "system" as const, label: "Sistema", icon: Monitor }
]

// ─── main component ───────────────────────────────────────────────────────────

export function SettingsView({ settings, onUpdate, onReset }: Props) {
  const { theme, setTheme } = useTheme()
  const autoLaunch = useAutoLaunch()

  const isDefault =
    settings.focusDuration === DEFAULT_SETTINGS.focusDuration &&
    settings.shortBreakDuration === DEFAULT_SETTINGS.shortBreakDuration &&
    settings.longBreakDuration === DEFAULT_SETTINGS.longBreakDuration &&
    settings.sessionsBeforeLongBreak === DEFAULT_SETTINGS.sessionsBeforeLongBreak &&
    settings.autoStartBreaks === DEFAULT_SETTINGS.autoStartBreaks &&
    settings.accentColor === DEFAULT_SETTINGS.accentColor

  return (
    <div className="flex flex-col h-full p-6 max-w-xl mx-auto w-full overflow-y-auto gap-5">

      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Personalize seu pomodoro</p>
      </div>

      {/* ── Aparência ──────────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
        <SectionTitle icon={Palette}>Aparência</SectionTitle>

        {/* Tema */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Tema</p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all duration-150",
                    active
                      ? "border-primary/60 bg-primary/8 text-primary shadow-sm"
                      : "border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {active && (
                    <Check
                      size={12}
                      className="absolute top-1.5 right-1.5 text-primary"
                      strokeWidth={3}
                    />
                  )}
                  <Icon size={18} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Cor de destaque */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Cor de destaque</p>
            <p className="text-[11px] text-muted-foreground">
              {ACCENT_COLORS[settings.accentColor].label}
            </p>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
              const def = ACCENT_COLORS[key]
              const active = settings.accentColor === key
              return (
                <button
                  key={key}
                  onClick={() => onUpdate({ accentColor: key })}
                  title={def.label}
                  aria-label={def.label}
                  className={cn(
                    "group relative aspect-square rounded-full transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    active
                      ? "ring-2 ring-foreground/40 ring-offset-2 ring-offset-card scale-105"
                      : "hover:scale-110 opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: def.swatch }}
                >
                  {active && (
                    <Check
                      size={14}
                      strokeWidth={3}
                      className="absolute inset-0 m-auto text-white drop-shadow"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Timer ─────────────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
        <SectionTitle icon={Timer}>Timer</SectionTitle>

        <SliderField
          label="Sessão de foco"
          description="Duração de cada bloco de concentração"
          value={settings.focusDuration}
          min={5}
          max={60}
          unit="min"
          onChange={(v) => onUpdate({ focusDuration: v })}
        />

        <div className="border-t border-border" />

        <SliderField
          label="Pausa curta"
          description="Intervalo entre sessões de foco"
          value={settings.shortBreakDuration}
          min={1}
          max={15}
          unit="min"
          onChange={(v) => onUpdate({ shortBreakDuration: v })}
        />

        <div className="border-t border-border" />

        <SliderField
          label="Pausa longa"
          description="Descanso maior ao final do ciclo"
          value={settings.longBreakDuration}
          min={5}
          max={30}
          unit="min"
          onChange={(v) => onUpdate({ longBreakDuration: v })}
        />

        <div className="border-t border-border" />

        <SliderField
          label="Sessões por ciclo"
          description="Quantas sessões de foco completam um ciclo"
          value={settings.sessionsBeforeLongBreak}
          min={2}
          max={8}
          unit="sessões"
          onChange={(v) => onUpdate({ sessionsBeforeLongBreak: v })}
        />

        <div className="border-t border-border" />

        <ToggleField
          label="Auto-iniciar pausas"
          description="A pausa começa automaticamente após o foco"
          value={settings.autoStartBreaks}
          onChange={(v) => onUpdate({ autoStartBreaks: v })}
        />
      </section>

      {/* ── Sistema ───────────────────────────────────────────────────────── */}
      {autoLaunch.supported && (
        <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
          <SectionTitle icon={Power}>Sistema</SectionTitle>

          <ToggleField
            label="Iniciar com o Windows"
            description="Abre o Pomodoro automaticamente quando você liga o computador"
            value={autoLaunch.enabled}
            onChange={autoLaunch.setAutoLaunch}
          />
        </section>
      )}

      {/* ── Reset ─────────────────────────────────────────────────────────── */}
      {!isDefault && (
        <div className="flex justify-end pb-2">
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
          >
            Restaurar padrões
          </button>
        </div>
      )}

    </div>
  )
}
