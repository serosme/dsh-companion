import type { Context } from '@deepseek-ai/cordis'
import type {} from './events.ts'

// 发一个开新会话的事件 谁来准备会话由订阅方决定
export function publishDaily(ctx: Context): void {
  console.log('daily published')

  ctx.emit('self/daily')
}
