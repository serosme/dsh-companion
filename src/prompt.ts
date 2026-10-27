import type { Context } from '@deepseek-ai/cordis'
import type { PromptSectionOrderName } from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from './shared/agent-scope.ts'

// 只讲前缀是什么意思 具体是哪件事写在标签里 标签自解释 不在这里列
const PROTOCOL = [
  '消息开头是 QQ | 的，是他在 QQ 上发来的。回不回、说什么、说多少，你定；要回就用 QQ 的发送动作发出去，别只在会话里自言自语。',
  '消息开头是 事件 | 的，不是他在说话，是发生了一件事，后面写着是什么。要不要有反应、怎么反应，你自己判断；没有想说的，就不说。',
  '不带前缀的，是他直接在这个界面里说的，接话就行；不要主动往 QQ 发消息，除非他让你发。',
].join('\n')

// 宿主注册 但这个部署不需要的段落 它们来自全局层 preset 管不到
// 只能在 agent 作用域注册一个同名空段落去遮蔽 空段落会被丢弃
const SILENCED_SECTIONS: readonly { readonly name: string, readonly order: PromptSectionOrderName }[] = [
  // 宿主的开场白 人格由 preset 的 persona 提供
  { name: 'harness:identity', order: 'HARNESS_IDENTITY' },
  // Web 文件卡说明 会教它去调一个不存在的 present
  { name: 'ui:deliverable-file-references', order: 'DELIVERABLE_FILE_REFERENCES' },
  // 宿主源码位置和前端热更新 陪伴用不上
  { name: 'harness:source', order: 'HARNESS_SOURCE' },
  { name: 'app:web-surface', order: 'WEB_SURFACE' },
]

// 注册陪伴的提示词段落 并清空宿主那些描述本部署没有的能力的段落
export function attachPrompt(ctx: Context, workspace: Workspace): void {
  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx
    const prompt = scope.systemPrompt

    scope.effect(() => {
      const disposers = [
        prompt.section({
          name: 'self:protocol',
          // 紧跟人格前缀 排在所有工具说明之前
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX') + 1,
          text: PROTOCOL,
        }),
        ...SILENCED_SECTIONS.map(({ name, order }) => silence(scope, name, order)),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:prompt:${String(agent.session.id)}`)

    console.log('attached prompt to', String(agent.session.id))
  })
}

// 用空段落遮蔽全局段落 同名注册可能撞车 失败只记日志 不连累其他注册
function silence(
  scope: Context,
  name: string,
  order: PromptSectionOrderName,
): () => void {
  try {
    return scope.systemPrompt.section({
      name,
      order: scope.systemPrompt.getSectionOrder(order),
      text: '',
    })
  }
  catch (error: unknown) {
    console.warn('failed to silence prompt section', name, error)
    return () => {}
  }
}
