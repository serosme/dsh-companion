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
  const log = ctx.logger()

  ctx.effect(() => {
    const job = new Cron(normalizeCron(options.cron), { timezone: TIME_ZONE }, () => {
      log.info(options.name, 'tick')
      options.task()
    })

    return () => job.stop()
  }, `dsh-companion:${options.name}`)

  log.info(options.name, 'scheduled with cron', options.cron)

  if (options.runNow !== true)
    return

  // 先注册再补跑 补跑失败不该让插件加载失败 也不该带走定时器
  try {
    options.task()
  }
  catch (error: unknown) {
    log.error(options.name, 'initial run failed', error)
  }
}
