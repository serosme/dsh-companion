import type { Context } from '@deepseek-ai/cordis'
import type { Outbox } from '../core/outbox.ts'
import type {} from './events.ts'

// 竖线后面的标签自解释 括号里是默认值 让它知道沉默是合法结果
const WAKEUP_MESSAGE = '事件 | 主动唤醒（不必有反应）'

// 收到事件后把那一句话交给 outbox 投出去
export function listenWakeup(
  ctx: Context,
  outbox: Outbox,
  describe: () => string,
): void {
  // 监听随插件执行域释放 不用手动注销
  ctx.on('self/wakeup', () => {
    console.log('wakeup received')

    // 投递异常由 outbox 吞掉 这里只看有没有送进会话
    void outbox.send(`${WAKEUP_MESSAGE} ${describe()}`).then((delivered) => {
      if (delivered)
        console.log('wakeup delivered')
      else
        console.warn('wakeup dropped')
    })
  })
}
