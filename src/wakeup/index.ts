import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from '../config.ts'
import type { Outbox } from '../core/outbox.ts'
import { schedule } from '../shared/cron.ts'

declare module '@deepseek-ai/cordis' {
  interface Events {
    // 到点了 谁要开口 投给谁 都由订阅方决定
    'companion/wakeup': () => void
  }
}

// 投进会话的那句话 竖线后面的标签要自解释
const WAKEUP_MESSAGE = '事件 | 主动唤醒'

export interface WakeupOptions {
  readonly outbox: Outbox
  readonly config: ConfigValue['wakeup']
}

// 发一个唤醒事件 谁来处理由订阅方决定
function publishWakeup(ctx: Context): void {
  console.log('wakeup published')

  // 派发给所有订阅这个事件的监听器
  ctx.emit('companion/wakeup')
}

// 收到事件后把那一句话交给 outbox 投出去
function listenWakeup(ctx: Context, outbox: Outbox): void {
  // 监听随插件执行域释放 不用手动注销
  ctx.on('companion/wakeup', () => {
    console.log('wakeup received, sending', WAKEUP_MESSAGE)

    // 投递异常由 outbox 吞掉 这里只关心有没有送进会话
    void outbox.send(WAKEUP_MESSAGE).then((delivered) => {
      console.log('wakeup delivered', delivered)
    })
  })
}

// 到点只发事件 不碰投递
function scheduleWakeup(ctx: Context, config: ConfigValue['wakeup']): void {
  // 定时器同样随插件执行域释放 不用手动 stop
  schedule(ctx, {
    name: 'wakeup',
    cron: config.cron,
    task: () => publishWakeup(ctx),
  })

  console.log('wakeup scheduled every', config.cron)
}

// 只负责把监听和定时器组装起来
export function attachWakeup(ctx: Context, options: WakeupOptions): void {
  // 先挂监听 再开定时器
  listenWakeup(ctx, options.outbox)

  // 开启定时发布
  scheduleWakeup(ctx, options.config)
}
