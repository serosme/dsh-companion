// 陪伴自己的时区 跨天判断和提醒时间都用它
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
