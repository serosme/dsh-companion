export interface PrivateMessage {
  readonly userId: string
  readonly text: string
}

// 只认白名单里的私聊 别的一律不看
export function readPrivateMessage(event: unknown, allow: ReadonlySet<string>): PrivateMessage | undefined {
  if (typeof event !== 'object' || event === null)
    return undefined

  const payload = event as Record<string, unknown>
  if (payload.post_type !== 'message' || payload.message_type !== 'private')
    return undefined

  const userId = String(payload.user_id ?? '')
  if (!allow.has(userId))
    return undefined

  const text = messageText(payload)
  if (text === '')
    return undefined

  return { userId, text }
}

// 空字符串是配置示例里的占位 不算一个人
export function normalizeAllow(list: readonly string[]): string[] {
  const cleaned = list
    .map(value => value.trim())
    .filter(value => value !== '')

  return Array.from(new Set(cleaned))
}

// QQ | QQ号 内容 号就是回复时的收件人
export function formatInbound(inbound: PrivateMessage): string {
  return `QQ | ${inbound.userId} ${inbound.text}`
}

// raw_message 是纯文本 没有就用消息段里的 text 拼
function messageText(payload: Record<string, unknown>): string {
  if (typeof payload.raw_message === 'string' && payload.raw_message.trim() !== '')
    return payload.raw_message.trim()

  if (!Array.isArray(payload.message))
    return ''

  return payload.message
    .filter(segment => typeof segment === 'object' && segment !== null)
    .map(segment => (segment as Record<string, unknown>).type === 'text'
      ? String(((segment as Record<string, unknown>).data as Record<string, unknown> | undefined)?.text ?? '')
      : '')
    .join('')
    .trim()
}
