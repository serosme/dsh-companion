import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from '../config.ts'
import type { Outbox } from '../core/outbox.ts'
import { schedule } from '../shared/cron.ts'
import { listenWakeup } from './listen.ts'
import { publishWakeup } from './publish.ts'

export interface WakeupOptions {
  readonly outbox: Outbox
  readonly config: ConfigValue['wakeup']
}

// 到点只发事件 不碰投递
function scheduleWakeup(ctx: Context, config: ConfigValue['wakeup']): void {
  // 定时器同样随插件执行域释放 不用手动 stop
  schedule(ctx, {
    name: 'wakeup',
    cron: config.cron,
    task: () => publishWakeup(ctx),
  })
}

// 只负责把监听和定时器组装起来
export function attachWakeup(ctx: Context, options: WakeupOptions): void {
  // 先挂监听 再开定时器
  listenWakeup(ctx, options.outbox)

  // 开启定时发布
  scheduleWakeup(ctx, options.config)
}
