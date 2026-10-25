import { Cron } from 'croner'
import { TIME_ZONE } from './time.ts'

export interface CronOptions {
  readonly cron: string
  readonly onTick: () => void
}

export function normalizeCron(cron: string): string {
  return cron.replaceAll('?', '*')
}

export function startCron(options: CronOptions): () => void {
  const job = new Cron(normalizeCron(options.cron), { timezone: TIME_ZONE }, options.onTick)
  return () => job.stop()
}
