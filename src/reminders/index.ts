import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../session/state.ts'
import { attachWorkspaceAgents } from '../shared/agent-scope.ts'
import { Reminders } from './scheduler.ts'
import { registerReminderTools } from './tools.ts'

// reminder_create 的触发时机 以后才发生的事 当场定下来 到点会以事件回来
const REMINDER_GUIDANCE = [
  '他说了以后才发生的事，当场用 reminder_create 定下来，别只口头答应。',
  '定之前先 current_time 拿到现在的准确时间再算 cron，别估。',
  '到点会以 提醒 事件回到这个会话，那时你接着那件事说。',
].join('')

export interface RemindersOptions {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
}

// 提醒的计时器和它的三个工具 还有没有别的工具由 preset 决定 不归这里管
export function attachReminders(ctx: Context, options: RemindersOptions): void {
  const reminders = new Reminders(ctx, options.workspace, options.state)

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
          name: 'companion:reminders',
          // 第二个工具说明位 排在 self 的触发段之后
          order: scope.systemPrompt.getSectionOrder('PLAN_POLICY') + 2,
          text: REMINDER_GUIDANCE,
        }),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:reminders:${String(agent.session.id)}`)

    console.log('reminder tools attached to', String(agent.session.id))
  })
}
