export type AccentColor = "purple" | "blue" | "cyan" | "green" | "orange" | "rose"

type AccentDef = {
  label: string
  hue: number
  chroma: number
  swatch: string
}

export const ACCENT_COLORS: Record<AccentColor, AccentDef> = {
  purple: { label: "Roxo",    hue: 292.6, chroma: 0.245, swatch: "#7c3aed" },
  blue:   { label: "Azul",    hue: 258,   chroma: 0.20,  swatch: "#2563eb" },
  cyan:   { label: "Ciano",   hue: 215,   chroma: 0.16,  swatch: "#0891b2" },
  green:  { label: "Verde",   hue: 152,   chroma: 0.16,  swatch: "#16a34a" },
  orange: { label: "Laranja", hue: 38,    chroma: 0.18,  swatch: "#ea580c" },
  rose:   { label: "Rosa",    hue: 12,    chroma: 0.20,  swatch: "#e11d48" }
}

export const DEFAULT_ACCENT: AccentColor = "purple"

export function applyAccentColor(key: AccentColor) {
  const { hue: h, chroma: c } = ACCENT_COLORS[key]

  // Foreground stays close to white but borrows a hint of the accent hue,
  // so primary buttons feel coherent instead of plastic.
  const fg = `oklch(0.985 0.012 ${h})`

  // Scale the chroma for variants — keeps deep tones saturated and
  // soft tones desaturated regardless of the chosen hue.
  const ch = (factor: number) => (c * factor).toFixed(3)

  let el = document.getElementById("accent-override") as HTMLStyleElement | null
  if (!el) {
    el = document.createElement("style")
    el.id = "accent-override"
    document.head.appendChild(el)
  }

  el.textContent = `
    :root {
      --primary:                    oklch(0.521 ${ch(1)}    ${h});
      --primary-foreground:         ${fg};
      --accent:                     oklch(0.521 ${ch(1)}    ${h});
      --accent-foreground:          ${fg};
      --ring:                       oklch(0.521 ${ch(1)}    ${h} / 50%);
      --secondary:                  oklch(0.955 ${ch(0.05)} ${h});
      --secondary-foreground:       oklch(0.24  ${ch(0.10)} ${h});
      --muted:                      oklch(0.955 ${ch(0.05)} ${h});
      --muted-foreground:           oklch(0.508 ${ch(0.12)} ${h});
      --border:                     oklch(0.905 ${ch(0.06)} ${h});
      --input:                      oklch(0.905 ${ch(0.06)} ${h});
      --chart-1:                    oklch(0.78  ${ch(0.55)} ${h});
      --chart-2:                    oklch(0.64  ${ch(0.90)} ${h});
      --chart-3:                    oklch(0.521 ${ch(1)}    ${h});
      --chart-4:                    oklch(0.43  ${ch(0.90)} ${h});
      --chart-5:                    oklch(0.34  ${ch(0.74)} ${h});
      --sidebar-primary:            oklch(0.521 ${ch(1)}    ${h});
      --sidebar-primary-foreground: ${fg};
      --sidebar-accent:             oklch(0.93  ${ch(0.07)} ${h});
      --sidebar-accent-foreground:  oklch(0.24  ${ch(0.10)} ${h});
      --sidebar-ring:               oklch(0.521 ${ch(1)}    ${h} / 50%);
    }
    .dark {
      --primary:                    oklch(0.625 ${ch(0.90)} ${h});
      --primary-foreground:         ${fg};
      --accent:                     oklch(0.625 ${ch(0.90)} ${h});
      --accent-foreground:          ${fg};
      --ring:                       oklch(0.625 ${ch(0.90)} ${h} / 55%);
      --secondary:                  oklch(0.265 ${ch(0.10)} ${h});
      --secondary-foreground:       oklch(0.97  ${ch(0.04)} ${h});
      --muted:                      oklch(0.245 ${ch(0.10)} ${h});
      --muted-foreground:           oklch(0.68  ${ch(0.12)} ${h});
      --chart-1:                    oklch(0.82  ${ch(0.50)} ${h});
      --chart-2:                    oklch(0.7   ${ch(0.82)} ${h});
      --chart-3:                    oklch(0.6   ${ch(0.94)} ${h});
      --chart-4:                    oklch(0.5   ${ch(0.90)} ${h});
      --chart-5:                    oklch(0.4   ${ch(0.74)} ${h});
      --sidebar-primary:            oklch(0.625 ${ch(0.90)} ${h});
      --sidebar-primary-foreground: ${fg};
      --sidebar-accent:             oklch(0.265 ${ch(0.10)} ${h});
      --sidebar-accent-foreground:  oklch(0.97  ${ch(0.04)} ${h});
      --sidebar-ring:               oklch(0.625 ${ch(0.90)} ${h} / 55%);
    }
  `
}
