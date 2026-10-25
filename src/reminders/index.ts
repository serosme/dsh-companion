import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../state/store.ts'
import { samePath } from '../shared/workspace.ts'
import { Reminders } from './scheduler.ts'
import { registerReminderTools } from './tools.ts'

export interface RemindersOptions {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
}

export function attachReminders(ctx: Context, options: RemindersOptions): void {
  const reminders = new Reminders(ctx, options.workspace, options.state)

  ctx.logger().info('reminders file', reminders.path)

  ctx.effect(() => {
    reminders.load()
    return () => reminders.dispose()
  }, 'dsh-companion:reminders')

  const attachAgent = (agent: Agent): void => {
    const cwd = agent.session.header.cwd
    if (cwd === undefined || !samePath(cwd, options.workspace.path))
      return

    ctx.effect(
      () => registerReminderTools(agent.ctx, reminders),
      `dsh-companion:reminders:${String(agent.session.id)}`,
    )

    ctx.logger().info('reminder tools attached to', String(agent.session.id))
  }

  ctx.on('agent/created', ({ agent }) => {
    attachAgent(agent)
  })

  for (const agent of ctx.agents.list())
    attachAgent(agent)
}
