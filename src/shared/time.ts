export const TIME_ZONE = 'Asia/Shanghai'

export function todayTitle(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
    .format(new Date())
    .replaceAll('-', '')
}
