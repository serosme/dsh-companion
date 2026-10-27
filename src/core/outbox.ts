import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../session/state.ts'
import { deliverToToday } from '../session/deliver.ts'

export interface Outbox {
  // 投进今天那条会话 上层不用知道是哪条 也不用管投递失败
  send: (text: string) => Promise<boolean>
}

// 全插件只有这一处知道会话从哪来 换投递目标只改这里
export function createOutbox(
  ctx: Context,
  workspace: Workspace,
  state: Conf<CompanionState>,
): Outbox {
  const log = ctx.logger()

  return {
    // 投一条消息进今天那条会话 送达返回 true
    send: async (text) => {
      try {
        // 目标会话由 deliverToToday 自己从 state 里取出来并校验
        const sessionId = await deliverToToday(ctx, {
          workspace,
          state,
          message: text,
        })

        // 没有可投的会话 不算异常 只算没送到
        if (sessionId === undefined)
          return false

        log.info('delivered to', sessionId)

        return true
      }
      catch (error: unknown) {
        // 投递是基础设施 调用方不该收到异常 也不该为此写 catch
        log.error('delivery failed', error)

        return false
      }
    },
  }
}
