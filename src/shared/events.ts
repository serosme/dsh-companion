// 固定词 标记这是时钟投递而不是用户发言 标签可配置 所以语义不能压在标签上
const EVENT_MARKER = '事件'

// 提醒到点用的标签 和每天那句新的一天并列 两种事件在提示词里说法不同
const REMINDER_EVENT_LABEL = '提醒'

// 只带标签不带时间 每次请求的运行时上下文里已经有当前时间 写两遍反而可能对不上
export function formatEvent(label: string): string {
  return `${EVENT_MARKER} | ${label}`
}

// 提醒事件把当初写下的那句话接在信封后面 让模型知道该接着哪件事说
export function formatReminderEvent(note: string): string {
  return `${formatEvent(REMINDER_EVENT_LABEL)} ${note}`
}
