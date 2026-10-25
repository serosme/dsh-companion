import type { Context } from '@deepseek-ai/cordis'
import { startCron } from '../shared/cron.ts'

export interface ScheduleOptions {
  readonly name: string
  readonly cron: string
  readonly task: () => void
  readonly runNow?: boolean
}

export function scheduleTask(ctx: Context, options: ScheduleOptions): void {
  const log = ctx.logger()

  const tick = (): void => {
    log.info(options.name, 'tick')
    options.task()
  }

  if (options.runNow === true)
    options.task()

  log.info(options.name, 'scheduled with cron', options.cron)

  ctx.effect(() => startCron({ cron: options.cron, onTick: tick }), `dsh-companion:${options.name}`)
}
