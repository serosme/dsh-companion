import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { ConfigValue } from '../config.ts'
import type { Outbox } from '../core/outbox.ts'
import type { CompanionState } from '../core/state.ts'
import { ensureTodaySession } from '../core/session.ts'
import { schedule } from '../shared/cron.ts'
import { formatEvent } from '../shared/events.ts'

declare module '@deepseek-ai/cordis' {
  interface Events {
    // 一天开始了 该把今天那条会话准备好
    'companion/daily': () => void
  }
}

export interface DailyOptions {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
  readonly outbox: Outbox
  readonly agentPreset: string
  readonly config: ConfigValue['daily']
}

// 发一个开新会话的事件 谁来准备会话由订阅方决定
function publishDaily(ctx: Context): void {
  console.log('daily published')

  ctx.emit('companion/daily')
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
  if (options.state.get('todaySessionId') !== outcome.sessionId)
    options.state.set('todaySessionId', outcome.sessionId)

  // 已经聊过的会话不补问候 免得每天重复打招呼
  if (!outcome.blank) {
    console.log('today session already has talk, no greeting')
    return
  }

  const delivered = await options.outbox.send(formatEvent(options.config.label))

  console.log('greeting', delivered ? 'delivered' : 'dropped')
}

// 收到事件就去准备会话 失败只打日志 不往外抛
function listenDaily(ctx: Context, options: DailyOptions): void {
  // 监听随插件执行域释放 不用手动注销
  ctx.on('companion/daily', () => {
    console.log('daily received')

    void openToday(ctx, options).catch((error: unknown) => {
      console.error('daily failed', error)
    })
  })
}

// 定时器只负责到点发事件 具体做什么由订阅方决定
function scheduleDaily(ctx: Context, config: ConfigValue['daily']): void {
  // 定时器同样随插件执行域释放 不用手动 stop
  schedule(ctx, {
    name: 'daily session',
    cron: config.cron,
    // 启动时补跑一次 停机期间错过的那天不至于没有会话
    runNow: true,
    task: () => publishDaily(ctx),
  })

  console.log('daily scheduled every', config.cron)
}

// 只负责把监听和定时器组装起来
export function attachDaily(ctx: Context, options: DailyOptions): void {
  // 先挂监听 再开定时器
  listenDaily(ctx, options)

  // 开启定时发布
  scheduleDaily(ctx, options.config)
}
