import type Conf from 'conf'
import type { RuntimeState } from './state.ts'
import { formatTime } from '../shared/time.ts'

// 醒过来时能看到的唯一信息 只说事实 不劝它开口
export function createWakeupBrief(
  state: Conf<RuntimeState>,
  pendingReminders: () => number,
): () => string {
  return () => {
    const now = Date.now()
    const pending = pendingReminders()

    return [
      `现在 ${formatTime(now)}`,
      describeSince('他上次说话', state.get('lastUserAt'), now),
      describeSince('你上次开口', state.get('lastAssistantAt'), now),
      pending === 0
        ? '没有待办的提醒'
        : `还有 ${pending} 件提醒`,
    ].join('，')
  }
}

function describeSince(label: string, at: number, now: number): string {
  if (at === 0)
    return `${label} 还没有过`

  return `${label} ${describeAgo(now - at)}`
}

function describeAgo(span: number): string {
  const minutes = Math.floor(span / 60_000)

  if (minutes < 1)
    return '刚刚'

  if (minutes < 60)
    return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours < 24) {
    return rest === 0
      ? `${hours} 小时前`
      : `${hours} 小时 ${rest} 分钟前`
  }

  return `${Math.floor(hours / 24)} 天前`
}
