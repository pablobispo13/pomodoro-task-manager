export function isElectron() {
  return !!(window as Window & { windowControls?: unknown })?.windowControls
}