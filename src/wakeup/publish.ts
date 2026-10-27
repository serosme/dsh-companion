import type { Context } from '@deepseek-ai/cordis'
import type {} from './events.ts'

// 发一个唤醒事件 谁来处理由订阅方决定
export function publishWakeup(ctx: Context): void {
  console.log('wakeup published')

  // 派发给所有订阅这个事件的监听器
  ctx.emit('self/wakeup')
}
