import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type { Outbox } from '../core/outbox.ts'
import { attachWorkspaceAgents } from '../shared/agent-scope.ts'
import { Reminders } from './scheduler.ts'
import { registerReminderTools } from './tools.ts'

// reminder_create 的触发时机 以后才发生的事 当场定下来 到点会以事件回来
const REMINDER_GUIDANCE = [
  '他说了以后才发生的事，当场用 reminder_create 定下来，别只口头答应。',
  '算 cron 之前先调 current_time 拿准现在几点，别估。',
  '到点它会以「提醒」事件回来，接着那件事说就行，不用重述整件事。',
].join('\n')

export interface RemindersOptions {
  readonly workspace: Workspace
  readonly outbox: Outbox
}

// 提醒的计时器和它的三个工具 还有没有别的工具由 preset 决定 不归这里管
export function attachReminders(ctx: Context, options: RemindersOptions): Reminders {
  const reminders = new Reminders(options.workspace.path, options.outbox)

  console.log('reminders file', reminders.path)

  ctx.effect(() => {
    reminders.load()
    return () => reminders.dispose()
  }, 'dsh-companion:reminders')

  attachWorkspaceAgents(ctx, options.workspace, (agent) => {
    const scope = agent.ctx

    scope.effect(() => {
      const disposers = [
        registerReminderTools(scope, reminders),
        scope.systemPrompt.section({
          name: 'self:reminders',
          // 第二个工具说明位 排在 self:remember 之后
          order: scope.systemPrompt.getSectionOrder('PLAN_POLICY') + 2,
          text: REMINDER_GUIDANCE,
        }),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:reminders:${String(agent.session.id)}`)

    console.log('attached reminders to', String(agent.session.id))
  })

  return reminders
}
