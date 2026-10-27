import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './config.ts'
import { attachClock } from './clock/index.ts'
import { attachPrompt } from './prompt.ts'
import { attachQq } from './qq/index.ts'
import { attachReminders } from './reminders/index.ts'
import { attachSelf } from './self/index.ts'
import { attachActivity } from './session/activity.ts'
import { prepareTodaySession, wakeTodaySession } from './session/index.ts'
import { openState } from './session/state.ts'
import { schedule } from './shared/cron.ts'
import { formatEvent } from './shared/events.ts'
import { requireWorkspace } from './shared/workspace.ts'

// 把各模块挂到工作区的 agent 上 并按配置排两个时钟任务
export function attachCompanion(ctx: Context, config: ConfigValue): void {
  const workspace = requireWorkspace(ctx, config.workspacePath)
  const state = openState(workspace.path)
  const log = ctx.logger()

  log.info('using workspace', workspace.path)
  log.info('state file', state.path)

  attachActivity(ctx, workspace, state)
  attachClock(ctx, workspace)
  attachReminders(ctx, { workspace, state })
  attachSelf(ctx, workspace)
  attachPrompt(ctx, workspace)
  attachQq(ctx, { workspace, state, config: config.qq })

  schedule(ctx, {
    name: 'daily session',
    cron: config.daily.cron,
    runNow: true,
    task: () => prepareTodaySession(ctx, {
      workspace,
      state,
      agentPreset: config.agentPreset,
      message: formatEvent(config.daily.label),
    }),
  })

  schedule(ctx, {
    name: 'wakeup',
    cron: config.wakeup.cron,
    task: () => wakeTodaySession(ctx, {
      workspace,
      state,
      gapMs: config.wakeup.gapMinutes * 60_000,
      message: formatEvent(config.wakeup.label),
    }),
  })
}
