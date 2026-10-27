import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from '../shared/agent-scope.ts'
import { createLineStore } from './lines.ts'
import { registerRememberTool } from './remember.ts'

// 两类设定的边界 判断标准是这句话改的是「我怎么说话」 还是「他是个什么样的人」
const REMEMBER_GUIDANCE = [
  '你写下的东西会跟着你到下一次会话。一共两个抽屉。',
  'target self 装你自己：名字、自称、说话的样子、你身上确实存在的脾气和偏好、你发现自己总在犯的错、你决定以后怎么做。',
  'target him 装他：他是谁、他的习惯、家人、工作、喜好、忌讳，只写长期成立的部分。',
  '分不清就判断一句：这句话改的是我怎么说话，还是他是个什么样的人。',
  '过时了就改掉或删掉，别只在末尾再叠一条新的。',
  '一次性的、过几天就没意义的事，两边都不要写。',
  '日常闲聊不用动它们。真正值得留下的，往往是你事后才反应过来的那句。',
].join('\n')

// 两份设定 以及改写它们的工具 静态人格在 preset 里 这里只管每次请求重新拼装的动态部分
export function attachMemory(ctx: Context, workspace: Workspace): void {
  const selfStore = createLineStore(workspace.path, 'self')
  const himStore = createLineStore(workspace.path, 'him')

  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx
    const prompt = scope.systemPrompt

    scope.effect(() => {
      const disposers = [
        prompt.section({
          name: 'self:me',
          // 换名字是为了避开 preset 里 deployment:persona-suffix 的同名注册 同 scope 重名会抛异常
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX'),
          text: () => selfStore.render(),
          interpolate: false,
        }),
        prompt.section({
          name: 'self:him',
          // 他的事比我变得勤 放在最后 改的时候前面那段前缀还能命中缓存
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX') + 1,
          text: () => himStore.render(),
          interpolate: false,
        }),
        prompt.section({
          name: 'self:remember',
          // 第一个工具说明位 触发条件属于工具区 不塞进人格
          order: prompt.getSectionOrder('PLAN_POLICY') + 1,
          text: REMEMBER_GUIDANCE,
        }),
        registerRememberTool(scope, { self: selfStore, him: himStore }),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:memory:${String(agent.session.id)}`)

    console.log('attached memory to', String(agent.session.id))
  })
}
