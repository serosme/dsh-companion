import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { ConfigValue } from '../config.ts'
import type { Outbox } from '../core/outbox.ts'
import type { RuntimeState } from '../core/state.ts'
import type {} from './events.ts'
import { ensureTodaySession } from '../core/session.ts'
import { formatEvent } from '../shared/events.ts'

export interface DailyOptions {
  readonly workspace: Workspace
  readonly state: Conf<RuntimeState>
  readonly outbox: Outbox
  readonly agentPreset: string
  readonly config: ConfigValue['daily']
}

// 准备好今天那条会话 再让 outbox 把问候投进去
async function openToday(ctx: Context, options: DailyOptions): Promise<void> {
  const outcome = await ensureTodaySession(ctx, {
    workspace: options.workspace,
    state: options.state,
    agentPreset: options.agentPreset,
  })

  console.log('today session', outcome.created ? 'created' : 'reused', outcome.sessionId)

  // outbox 按 state 里的 id 投递 先把它指到今天这条
  if (options.state.get('todaySessionId') !== outcome.sessionId) {
    options.state.set('todaySessionId', outcome.sessionId)
    console.log('state todaySessionId', outcome.sessionId)
  }

  // 已经聊过的会话不补问候 免得每天重复打招呼
  if (!outcome.blank) {
    console.log('today session has messages, skip greeting')
    return
  }

  const delivered = await options.outbox.send(formatEvent(options.config.label))

  if (delivered)
    console.log('greeting delivered')
  else
    console.warn('greeting dropped')
}

// 收到事件就去准备会话 失败只打日志 不往外抛
export function listenDaily(ctx: Context, options: DailyOptions): void {
  // 监听随插件执行域释放 不用手动注销
  ctx.on('self/daily', () => {
    console.log('daily received')

    void openToday(ctx, options).catch((error: unknown) => {
      console.error('daily failed', error)
    })
  })
}
