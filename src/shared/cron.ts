import type { Context } from '@deepseek-ai/cordis'
import { Cron } from 'croner'
import { TIME_ZONE } from './time.ts'

export interface ScheduledTask {
  readonly name: string
  readonly cron: string
  readonly task: () => void
  // 插件启动时立刻跑一次 用来补上停机期间错过的那次
  readonly runNow?: boolean
}

export function normalizeCron(cron: string): string {
  return cron.replaceAll('?', '*')
}

// 注册一个 cron 任务 定时器随插件执行域释放
export function schedule(ctx: Context, options: ScheduledTask): void {
  ctx.effect(() => {
    const job = new Cron(normalizeCron(options.cron), { timezone: TIME_ZONE }, () => {
      console.log(options.name, 'tick')

      // croner 不接回调抛出的异常 抛出去就是没人接的 rejection 会让宿主退出
      // 错过一拍下一拍还在 记一条日志就行
      try {
        options.task()
      }
      catch (error: unknown) {
        console.error(options.name, 'tick failed', error)
      }
    })

    return () => job.stop()
  }, `dsh-companion:${options.name}`)

  console.log(options.name, 'scheduled with cron', options.cron)

  if (options.runNow !== true)
    return

  // 先注册再补跑 补跑失败不该让插件加载失败 也不该带走定时器
  try {
    options.task()
  }
  catch (error: unknown) {
    console.error(options.name, 'initial run failed', error)
  }
}
