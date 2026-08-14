export function clampPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(100, Math.max(0, numeric))
}

export function formatPercent(value, digits = 2) {
  const clamped = clampPercent(value)
  return `${clamped.toFixed(digits).replace(/\.00$/, '')}%`
}

export function formatXaf(value) {
  const numeric = Number(value)
  const safeValue = Number.isFinite(numeric) ? Math.max(0, numeric) : 0
  return `${new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(safeValue)} XAF`
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return Number(count) === 1 ? singular : plural
}

export function countLabel(count, singular, plural = `${singular}s`) {
  const numeric = Number(count)
  const safeCount = Number.isFinite(numeric) ? numeric : 0
  return `${safeCount} ${pluralize(safeCount, singular, plural)}`
}
