import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './base/index.ts'
import { attachBase } from './base/index.ts'
import { attachLogger } from './logger.ts'

export const name = 'dsh-companion'
export const inject = [
  'sessionController',
  'workspaceRegistry',
  'tools',
  'agents',
]

export { Config } from './base/index.ts'

export function apply(ctx: Context, config: ConfigValue): void {
  attachLogger(ctx)
  attachBase(ctx, config)
  ctx.logger().info('plugin loaded')
}
