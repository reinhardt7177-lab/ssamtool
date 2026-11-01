export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

export function baseName(name: string): string {
  const slash = name.lastIndexOf('/')
  const file = slash < 0 ? name : name.slice(slash + 1)
  const i = file.lastIndexOf('.')
  return i < 0 ? file : file.slice(0, i)
}

export function withSuffix(name: string, suffix: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? name + suffix : name.slice(0, i) + suffix + name.slice(i)
}
