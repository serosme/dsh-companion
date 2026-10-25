import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../state/store.ts'
import { SessionId } from '@deepseek-ai/dsh-session'
import { deliverPrompt } from '../session/deliver.ts'

export interface WakeupOptions {
  readonly workspace: Workspace
  readonly message: string
  readonly signal: AbortSignal
  readonly state: Conf<CompanionState>
}

export function wakeTodaySession(ctx: Context, options: WakeupOptions): void {
  void wake(ctx, options).catch((error: unknown) => {
    if (options.signal.aborted)
      return

    ctx.logger().error('failed to wake today session', error)
  })
}

async function wake(ctx: Context, options: WakeupOptions): Promise<void> {
  const log = ctx.logger()
  const stored = options.state.get('todaySessionId')

  if (stored === '') {
    log.info('no stored today session to wake')
    return
  }

  const sessionId = SessionId(stored)

  if (!options.workspace.sessionIds.includes(sessionId)) {
    log.info('stored today session is not in workspace', stored)
    return
  }

  if (ctx.workspaceRegistry.archivedSessionIds.includes(sessionId)) {
    log.info('stored today session is archived', stored)
    return
  }

  await deliverPrompt(ctx, sessionId, options.message)

  log.info('woke today session', stored)
}
