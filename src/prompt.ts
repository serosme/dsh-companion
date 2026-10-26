import type { Context } from '@deepseek-ai/cordis'
import type { PromptSectionOrderName } from '@deepseek-ai/dsh-system-prompt'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { attachWorkspaceAgents } from './shared/agent-scope.ts'

// 时钟事件长什么样 该怎么回应 它以 user 角色进来 别处没人告诉模型这不是他说的
// 只描述形状 不描述具体标签 标签改了这段仍然成立
const COMPANION_PROTOCOL = [
  '凡是开头是 事件 两个字、中间隔着一条竖线、后面跟着时间的消息，都不是他发给你的——那是外面发生的事：一天开始了，或者到点了。',
  '它不是提问，不用只回一句在，也不用汇报进度。看一眼提醒，再想昨天有没有没接上的话，然后自己决定要不要开口；不开口也是一种回答。',
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
