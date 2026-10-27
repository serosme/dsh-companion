import type { Context } from '@deepseek-ai/cordis'
import type { Outbox } from '../core/outbox.ts'
import type {} from './events.ts'

// 投进会话的那句话 竖线后面的标签要自解释
const WAKEUP_MESSAGE = '事件 | 主动唤醒'

// 收到事件后把那一句话交给 outbox 投出去
export function listenWakeup(ctx: Context, outbox: Outbox): void {
  // 监听随插件执行域释放 不用手动注销
  ctx.on('companion/wakeup', () => {
    console.log('wakeup received')

    // 投递异常由 outbox 吞掉 这里只看有没有送进会话
    void outbox.send(WAKEUP_MESSAGE).then((delivered) => {
      if (delivered)
        console.log('wakeup delivered')
      else
        console.warn('wakeup dropped')
    })
  })
}
