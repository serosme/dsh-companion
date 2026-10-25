import type { Context } from '@deepseek-ai/cordis'
import { attachLogger } from './logger.ts'

export const name = 'dsh-companion'

export function apply(ctx: Context) {
  attachLogger(ctx)
  ctx.logger.info('plugin loaded')
}
