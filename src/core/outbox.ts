import type { Context } from '@deepseek-ai/cordis'
import type { MessageSource } from '@deepseek-ai/dsh-llm/message'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { RuntimeState } from './state.ts'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { SessionId as toSessionId } from '@deepseek-ai/dsh-session'

declare module '@deepseek-ai/dsh-llm/message' {
  interface MessageSourceMap {
    self: { kind: 'self' }
    him: { kind: 'him' }
  }
}

export interface Outbox {
  // 投进今天那条会话 上层不用知道是哪条 也不用管投递失败
  send: (text: string, source?: MessageSource) => Promise<boolean>
}

// 投递需要的全部东西 投给谁由 state 决定
interface Delivery {
  readonly workspace: Workspace
  readonly state: Conf<RuntimeState>
  readonly message: string
  readonly source?: MessageSource
}

// 投进某条会话 调用前会话必须已经存在
async function deliverPrompt(
  ctx: Context,
  sessionId: SessionId,
  text: string,
  source: MessageSource,
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

// 投进当天会话 没有可用会话时返回 undefined
async function deliverToToday(
  ctx: Context,
  options: Delivery,
): Promise<SessionId | undefined> {
  const stored = options.state.get('todaySessionId')

  if (!stored) {
    console.log('no stored today session')
    return undefined
  }

  const sessionId = toSessionId(stored)

  if (!options.workspace.sessionIds.includes(sessionId)) {
    console.log('stored today session is not in workspace', stored)
    return undefined
  }

  if (ctx.workspaceRegistry.archivedSessionIds.includes(sessionId)) {
    console.log('stored today session is archived', stored)
    return undefined
  }

  await deliverPrompt(ctx, sessionId, options.message, options.source ?? { kind: 'self' })

  return sessionId
}

// 全插件只有这一处知道会话从哪来 换投递目标只改这里
export function createOutbox(
  ctx: Context,
  workspace: Workspace,
  state: Conf<RuntimeState>,
): Outbox {
  return {
    // 投一条消息进今天那条会话 送达返回 true
    send: async (text, source) => {
      try {
        // 目标会话由 deliverToToday 自己从 state 里取出来并校验
        const sessionId = await deliverToToday(ctx, {
          workspace,
          state,
          message: text,
          source,
        })

        // 没有可投的会话 不算异常 只算没送到
        if (sessionId === undefined)
          return false

        console.log('delivered to', sessionId)

        return true
      }
      catch (error: unknown) {
        // 投递是基础设施 调用方不该收到异常 也不该为此写 catch
        console.error('delivery failed', error)

        return false
      }
    },
  }
}
