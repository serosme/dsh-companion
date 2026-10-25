import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './config.ts'
import { attachReminders } from '../reminders/index.ts'
import { attachSelf } from '../self/index.ts'
import { prepareTodaySession } from '../session/index.ts'
import { requireWorkspace } from '../shared/workspace.ts'
import { attachState } from '../state/index.ts'
import { wakeTodaySession } from '../wakeup/index.ts'
import { scheduleTask } from './schedule.ts'

export { Config } from './config.ts'
export type { ConfigValue } from './config.ts'

export function attachBase(ctx: Context, config: ConfigValue): void {
  const workspace = requireWorkspace(ctx, config.workspacePath)
  const state = attachState(ctx, workspace)
  const controller = new AbortController()

  ctx.logger().info('using workspace', workspace.path)

  ctx.effect(() => () => controller.abort())

  attachReminders(ctx, { workspace, state })
  attachSelf(ctx, workspace)

  scheduleTask(ctx, {
    name: 'daily session',
    cron: config.daily.cron,
    runNow: true,
    task: () => prepareTodaySession(ctx, {
      workspace,
      message: config.daily.message,
      signal: controller.signal,
      state,
    }),
  })

  scheduleTask(ctx, {
    name: 'wakeup',
    cron: config.wakeup.cron,
    task: () => wakeTodaySession(ctx, {
      workspace,
      message: config.wakeup.message,
      signal: controller.signal,
      state,
    }),
  })
}
