import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from '../shared/agent-scope.ts'
import { createSelfStore } from './store.ts'
import { registerSelfTools } from './tools.ts'

// self_revise 的触发时机 操作细节在工具描述里 这里只讲什么时候该动
const SELF_GUIDANCE = [
  '他给你的称呼、他的偏好和忌讳、你反复没做到的事，用 self_revise 写进人设。',
  '人设是唯一会留到下一次会话的东西，写在别处的东西下次读不到。',
  '日常闲聊不要动它。',
].join('')

// 人格文件 以及改写它的工具 静态人格在 preset 里 这里只管每次请求重新拼装的动态部分
export function attachSelf(ctx: Context, workspace: Workspace): void {
  const store = createSelfStore(workspace.path)

  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx
    const prompt = scope.systemPrompt

    scope.effect(() => {
      const disposers = [
        prompt.section({
          name: 'companion:memory',
          // 换名字是为了避开 preset 里 deployment:persona-suffix 的同名注册 同 scope 重名会抛异常
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX'),
          text: () => store.render(),
          interpolate: false,
        }),
        prompt.section({
          name: 'companion:self',
          // 第一个工具说明位 触发条件属于工具区 不塞进人格
          order: prompt.getSectionOrder('PLAN_POLICY') + 1,
          text: SELF_GUIDANCE,
        }),
        registerSelfTools(scope, store, ctx.logger()),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:self:${String(agent.session.id)}`)

    ctx.logger().info('companion memory attached to', String(agent.session.id))
  })
}
