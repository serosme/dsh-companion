import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { attachWorkspaceAgents } from '../shared/agent-scope.ts'
import { formatTime, formatWeekday, TIME_ZONE } from '../shared/time.ts'
import { jsonOutput } from '../shared/tool.ts'

// 模型自己算不出现在几点 给它一个一问就有的工具 免得它去别处绕
export function attachClock(ctx: Context, workspace: Workspace): void {
  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx

    scope.effect(() => scope.tools.register(defineTool({
      name: 'current_time',
      description: '现在几点。要说「一分钟后」「明天下午三点」，或者要写 cron 之前，先调它。别用消息时间戳或别的办法推断。',
      parameters: {},
      output: jsonOutput({
        type: 'object',
        additionalProperties: false,
        properties: {
          local: { type: 'string', required: true },
          weekday: { type: 'string', required: true },
          timeZone: { type: 'string', required: true },
        },
      }),
      async execute() {
        const now = Date.now()

        return {
          local: formatTime(now),
          weekday: formatWeekday(now),
          timeZone: TIME_ZONE,
        }
      },
    })), `dsh-companion:clock:${String(agent.session.id)}`)
  })
}
