export function isElectron() {
  return !!(window as any)?.windowControls
}