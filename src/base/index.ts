import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './config.ts'
import { prepareTodaySession } from '../session/index.ts'
import { requireWorkspace } from '../shared/workspace.ts'
import { scheduleTodaySession } from './schedule.ts'

export { Config } from './config.ts'
export type { ConfigValue } from './config.ts'

export function attachBase(ctx: Context, config: ConfigValue): void {
  const workspace = requireWorkspace(ctx, config.workspacePath)
  const controller = new AbortController()

  ctx.effect(() => () => controller.abort())

  scheduleTodaySession(ctx, {
    cron: config.cron,
    task: () => prepareTodaySession(ctx, { workspace, message: config.message, signal: controller.signal }),
  })
}
