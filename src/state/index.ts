import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from './store.ts'
import { openState } from './store.ts'
import { formatMessageTime } from './track.ts'

export function attachState(ctx: Context, workspace: Workspace): Conf<CompanionState> {
  const state = openState(workspace.path)

  ctx.logger().info('state file', state.path)

  ctx.effect(() => ctx.on('session/event', (session, event) => {
    const at = formatMessageTime(session, event, workspace.path)
    if (at === undefined || at === state.get('lastMessageAt'))
      return

    state.set('lastMessageAt', at)
    ctx.logger().info('state lastMessageAt', at)
  }))

  return state
}
