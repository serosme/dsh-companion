import type { Context } from '@deepseek-ai/cordis'
import type { ConfigValue } from './config.ts'
import { attachClock } from './clock/index.ts'
import { createOutbox } from './core/outbox.ts'
import { openState } from './core/state.ts'
import { attachDaily } from './daily/index.ts'
import { attachPrompt } from './prompt.ts'
import { attachQq } from './qq/index.ts'
import { attachReminders } from './reminders/index.ts'
import { attachSelf } from './self/index.ts'
import { requireWorkspace } from './shared/workspace.ts'
import { attachWakeup } from './wakeup/index.ts'

// 把各模块挂到工作区的 agent 上
export function attachCompanion(ctx: Context, config: ConfigValue): void {
  const workspace = requireWorkspace(ctx, config.workspacePath)
  const state = openState(workspace.path)
  const outbox = createOutbox(ctx, workspace, state)

  console.log('using workspace', workspace.path)
  console.log('state file', state.path)

  attachClock(ctx, workspace)
  attachReminders(ctx, { workspace, outbox })
  attachSelf(ctx, workspace)
  attachPrompt(ctx, workspace)
  attachQq(ctx, { outbox, config: config.qq })
  attachWakeup(ctx, { outbox, config: config.wakeup })
  attachDaily(ctx, {
    workspace,
    state,
    outbox,
    agentPreset: config.agentPreset,
    config: config.daily,
  })
}
