// 陪伴自己的时区 跨天判断和提醒时间都用它
export const TIME_ZONE = 'Asia/Shanghai'

export function todayTitle(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
    .format(new Date())
    .replaceAll('-', '')
}

// 形如 2026-10-27 10:29:28
export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(ms)
}

// 形如 2026-10-27T10:29:28+08:00 人看得懂 Date.parse 也认
export function formatIsoLocal(ms: number = Date.now()): string {
  const local = formatTime(ms).replace(' ', 'T')

  return `${local}${offsetOf(ms)}`
}

// 存的是可读时间 读回来要换算成毫秒 解析不了就当没记过
export function parseIsoLocal(value: string): number | undefined {
  if (value.trim() === '')
    return undefined

  const ms = Date.parse(value)

  return Number.isNaN(ms)
    ? undefined
    : ms
}

// 形如 星期二
export function formatWeekday(ms: number = Date.now()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: TIME_ZONE,
    weekday: 'long',
  }).format(ms)
}

// 形如 +08:00
function offsetOf(ms: number): string {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(ms)
    .find(part => part.type === 'timeZoneName')
    ?.value ?? 'GMT'

  return name === 'GMT'
    ? '+00:00'
    : name.replace('GMT', '')
}
