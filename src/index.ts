import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './base/index.ts'
import { attachBase } from './base/index.ts'
import { attachLogger } from './logger.ts'

export const name = 'dsh-companion'
export const inject = ['sessionController', 'workspaceRegistry']

export { Config } from './base/index.ts'

export function apply(ctx: Context, config: ConfigValue): void {
  attachLogger(ctx)
  ctx.logger().info('plugin loaded')
  attachBase(ctx, config)
}
