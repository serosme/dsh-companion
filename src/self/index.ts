import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from '../shared/agent-scope.ts'
import { createLineStore } from './store.ts'
import { registerSelfTools } from './tools.ts'

// 两类设定的边界 判断标准是能不能落到某一句话上 能就是关于自己 不能就是关于他的事
const SELF_GUIDANCE = [
  '他的话里有两类东西值得留下来，都用 self_revise 记下，下次会话还在。',
  '关于你的写 target self：他给你的称呼、你的自称、语气、你反复没做到的事。',
  '关于他的写 target profile：姓名、作息、家人、工作、喜好、忌讳，只写长期成立的。',
  '判断哪边：能直接决定你下一句怎么说的写 self，只是描述他这个人或他的生活的写 profile。',
  '旧的说法过时了就改掉或删掉，别只往末尾加一条新的。',
  '一次性的、过几天就过期的事，两边都不要写。',
  '日常闲聊不要动它们。',
].join('')

// 两份设定 以及改写它们的工具 静态人格在 preset 里 这里只管每次请求重新拼装的动态部分
export function attachSelf(ctx: Context, workspace: Workspace): void {
  const selfStore = createLineStore(workspace.path, 'self')
  const profileStore = createLineStore(workspace.path, 'profile')

  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx
    const prompt = scope.systemPrompt

    scope.effect(() => {
      const disposers = [
        prompt.section({
          name: 'companion:memory',
          // 换名字是为了避开 preset 里 deployment:persona-suffix 的同名注册 同 scope 重名会抛异常
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX'),
          text: () => selfStore.render(),
          interpolate: false,
        }),
        prompt.section({
          name: 'companion:profile',
          // 他的事比我变得勤 放在最后 改的时候前面那段前缀还能命中缓存
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX') + 1,
          text: () => profileStore.render(),
          interpolate: false,
        }),
        prompt.section({
          name: 'companion:self',
          // 第一个工具说明位 触发条件属于工具区 不塞进人格
          order: prompt.getSectionOrder('PLAN_POLICY') + 1,
          text: SELF_GUIDANCE,
        }),
        registerSelfTools(scope, { self: selfStore, profile: profileStore }),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:self:${String(agent.session.id)}`)

    console.log('attached memory to', String(agent.session.id))
  })
}
