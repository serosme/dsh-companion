import type { Context } from '@deepseek-ai/cordis'
import type { MessageSource } from '@deepseek-ai/dsh-llm/message'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from './state.ts'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { SessionId as toSessionId } from '@deepseek-ai/dsh-session'

declare module '@deepseek-ai/dsh-llm/message' {
  interface MessageSourceMap {
    companion: { kind: 'companion' }
    qq: { kind: 'qq' }
  }
}

// 一次投递需要的全部东西 投给谁由 state 决定
export interface Delivery {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
  readonly message: string
  readonly source?: MessageSource
}

export async function deliverPrompt(
  ctx: Context,
  sessionId: SessionId,
  text: string,
  source: MessageSource = { kind: 'companion' },
): Promise<void> {
  const resolved = await ctx.sessionController.resolveAgent(sessionId)
  if ('error' in resolved)
    throw new Error(`${resolved.error.code} ${resolved.error.message}`)

  resolved.agent.followup(createUserMessage({
    content: [
      { type: 'text', text },
    ],
    source,
  }))
}

// 投进当天会话 没有可用会话时返回 undefined 由调用方决定算不算失败
export async function deliverToToday(
  ctx: Context,
  options: Delivery,
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

  await deliverPrompt(ctx, sessionId, options.message, options.source)

  return sessionId
}
