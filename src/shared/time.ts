// 陪伴自己的时区 跨天判断和事件时间戳都用它
export const TIME_ZONE = 'Asia/Shanghai'

export function todayTitle(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
    .format(new Date())
    .replaceAll('-', '')
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(ms)
}

// 形如 `2026-10-26 06:30` sv-SE 天然是 ISO 风格 不用手拼
export function formatStamp(ms: number): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(ms)
}

// 形如 `2026-10-26`
export function formatDay(ms: number): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
  }).format(ms)
}
