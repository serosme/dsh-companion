import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from '../config.ts'
import type { DailyOptions } from './listen.ts'
import { schedule } from '../shared/cron.ts'
import { listenDaily } from './listen.ts'
import { publishDaily } from './publish.ts'

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
}

// 只负责把监听和定时器组装起来
export function attachDaily(ctx: Context, options: DailyOptions): void {
  // 先挂监听 再开定时器
  listenDaily(ctx, options)

  // 开启定时发布
  scheduleDaily(ctx, options.config)
}
