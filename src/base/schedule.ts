import type { Context } from '@deepseek-ai/cordis'
import { startCron } from '../shared/cron.ts'

export interface ScheduleOptions {
  readonly cron: string
  readonly task: () => void
}

export function scheduleTodaySession(ctx: Context, options: ScheduleOptions): void {
  options.task()

  ctx.logger().info('daily session scheduled with cron', options.cron)

  ctx.effect(() => startCron({ cron: options.cron, onTick: options.task }), 'dsh-companion:base')
}
