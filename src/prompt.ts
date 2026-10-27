import type { Context } from '@deepseek-ai/cordis'
import type { PromptSectionOrderName } from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from './shared/agent-scope.ts'

// 三种消息来源 各自的处理方式不一样 说清前缀是在说来源 不描述工具怎么调
const COMPANION_PROTOCOL = [
  '带 QQ | 前缀的是他在 QQ 上发来的，要回。回的时候用 QQ 的发送动作把话发出去，不要只在会话里说。',
  '带 事件 | 前缀的是外面发生的事：新的一天 表示一天开始，主动唤醒 表示到点了，提醒 是你自己之前定下的。这种时候自己判断要不要开口，开口也是往 QQ 发消息；不想说就不发，可以想想有没有没聊完的话题。',
  '不带前缀的是他直接在这个会话里说的话，接话就行；不要主动往 QQ 发消息，除非他明确让你发。',
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
  const log = ctx.logger()

  attachWorkspaceAgents(ctx, workspace, (agent) => {
    const scope = agent.ctx
    const prompt = scope.systemPrompt

    scope.effect(() => {
      const disposers = [
        prompt.section({
          name: 'companion:protocol',
          // 紧跟人格前缀 排在所有工具说明之前
          order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX') + 1,
          text: COMPANION_PROTOCOL,
        }),
        ...SILENCED_SECTIONS.map(({ name, order }) => silence(scope, name, order, log)),
      ]

      return () => {
        for (const dispose of disposers)
          dispose()
      }
    }, `dsh-companion:prompt:${String(agent.session.id)}`)

    log.info('companion prompt attached to', String(agent.session.id))
  })
}

// 用空段落遮蔽全局段落 同名注册可能撞车 失败只记日志 不连累其他注册
function silence(
  scope: Context,
  name: string,
  order: PromptSectionOrderName,
  log: ReturnType<Context['logger']>,
): () => void {
  try {
    return scope.systemPrompt.section({
      name,
      order: scope.systemPrompt.getSectionOrder(order),
      text: '',
    })
  }
  catch (error: unknown) {
    log.warn('failed to silence prompt section', name, error)
    return () => {}
  }
}
