import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from '../shared/agents.ts'
import { COMPANION_IDENTITY } from './identity.ts'
import { renderSelf } from './store.ts'
import { registerSelfTools } from './tools.ts'

export function attachSelf(ctx: Context, workspace: Workspace): void {
  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx
    const prompt = scope.systemPrompt

    scope.effect(() => {
      const disposers = [
        prompt.section({
          name: 'harness:identity',
          order: prompt.getSectionOrder('HARNESS_IDENTITY'),
          text: COMPANION_IDENTITY,
        }),
        prompt.section({
          name: 'deployment:persona-prefix',
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX'),
          text: '',
        }),
        prompt.section({
          name: 'deployment:persona-suffix',
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX'),
          text: () => renderSelf(workspace.path),
          interpolate: false,
        }),
        registerSelfTools(scope, workspace, ctx.logger()),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:self:${String(agent.session.id)}`)

    ctx.logger().info('companion prompt attached to', String(agent.session.id))
  })
}
