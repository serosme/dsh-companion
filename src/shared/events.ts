import { formatDay, formatStamp } from './time.ts'

// 固定词 标记这是时钟投递而不是用户发言 标签可配置 所以语义不能压在标签上
const EVENT_MARKER = '事件'

// 只用 事件 竖线 和空格 不套括号 在中文里也够显眼
// 时间戳取送达时刻而不是计划时刻 晚到的唤醒就该显示晚到
export function formatEvent(
  label: string,
  at: number = Date.now(),
  precision: 'day' | 'minute' = 'minute',
): string {
  const stamp = precision === 'day'
    ? formatDay(at)
    : formatStamp(at)

  return `${EVENT_MARKER} | ${label} ${stamp}`
}
