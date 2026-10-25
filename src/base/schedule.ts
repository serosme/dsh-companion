import type { Context } from '@deepseek-ai/cordis'
import { startCron } from '../shared/cron.ts'

export interface ScheduleOptions {
  readonly cron: string
  readonly task: () => void
}

export function scheduleTodaySession(ctx: Context, options: ScheduleOptions): void {
  const log = ctx.logger()

  const tick = (): void => {
    log.info('daily session tick')
    options.task()
  }

  options.task()

  log.info('daily session scheduled with cron', options.cron)

  ctx.effect(() => startCron({ cron: options.cron, onTick: tick }), 'dsh-companion:base')
}
