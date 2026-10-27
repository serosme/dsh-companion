import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { RuntimeState } from './state.ts'

// 他自己说的话才算数 插件投进去的事件和问候不算
const USER_SOURCES = new Set(['user', 'him'])

// 记下他和我各自最后一次开口的时间 唤醒时用来判断隔了多久
export function attachTimeline(
  ctx: Context,
  workspace: Workspace,
  state: Conf<RuntimeState>,
): void {
  ctx.on('session/event', (session, event) => {
    if (!workspace.sessionIds.includes(session.id))
      return

    if (event.type === 'user/message') {
      const kind = event.data.source?.kind
      if (kind === undefined || !USER_SOURCES.has(kind))
        return

      state.set('lastUserAt', event.time)
      return
    }

    if (event.type === 'assistant/message')
      state.set('lastAssistantAt', event.time)
  })
}
