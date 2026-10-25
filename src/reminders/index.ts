import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../state/store.ts'
import { attachWorkspaceAgents } from '../shared/agents.ts'
import { Reminders } from './scheduler.ts'
import { registerReminderTools } from './tools.ts'

const SCHEDULE_TOOLS = [
  'schedule_create',
  'schedule_delete',
  'schedule_list',
  'schedule_update',
]

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

  attachWorkspaceAgents(ctx, options.workspace, (agent) => {
    const scope = agent.ctx

    scope.effect(() => {
      const disposers = [
        registerReminderTools(scope, reminders),
        hideScheduleTools(ctx, scope),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:reminders:${String(agent.session.id)}`)

    ctx.logger().info('reminder tools attached to', String(agent.session.id))
  })
}

function hideScheduleTools(ctx: Context, scope: Context): () => void {
  try {
    return scope.tools.restrict({ deny: SCHEDULE_TOOLS })
  }
  catch (error: unknown) {
    ctx.logger().warn('failed to hide schedule tools', error)
    return () => {}
  }
}
