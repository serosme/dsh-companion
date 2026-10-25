import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../state/store.ts'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { SessionId as toSessionId } from '@deepseek-ai/dsh-session'

declare module '@deepseek-ai/dsh-llm/message' {
  interface MessageSourceMap {
    companion: { kind: 'companion' }
  }
}

export interface TodayDeliveryOptions {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
  readonly message: string
}

export async function deliverPrompt(ctx: Context, sessionId: SessionId, text: string): Promise<void> {
  const resolved = await ctx.sessionController.resolveAgent(sessionId)
  if ('error' in resolved)
    throw new Error(`${resolved.error.code} ${resolved.error.message}`)

  resolved.agent.followup(createUserMessage({
    content: [
      { type: 'text', text },
    ],
    source: { kind: 'companion' },
  }))
}

export async function deliverToToday(
  ctx: Context,
  options: TodayDeliveryOptions,
): Promise<SessionId | undefined> {
  const log = ctx.logger()
  const stored = options.state.get('todaySessionId')

  if (!stored) {
    log.info('no stored today session')
    return undefined
  }

  const sessionId = toSessionId(stored)

  if (!options.workspace.sessionIds.includes(sessionId)) {
    log.info('stored today session is not in workspace', stored)
    return undefined
  }

  if (ctx.workspaceRegistry.archivedSessionIds.includes(sessionId)) {
    log.info('stored today session is archived', stored)
    return undefined
  }

  await deliverPrompt(ctx, sessionId, options.message)

  return sessionId
}
