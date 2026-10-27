import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './config.ts'
import { attachCompanion } from './attach.ts'

export const name = 'dsh-companion'
export const inject = [
  'sessionController',
  'workspaceRegistry',
  'tools',
  'agents',
  'systemPrompt',
]

export { Config } from './config.ts'

export function apply(ctx: Context, config: ConfigValue): void {
  attachCompanion(ctx, config)
  console.log('plugin loaded')
}
