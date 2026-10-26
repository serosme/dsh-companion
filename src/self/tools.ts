import type { Context, Logger } from '@deepseek-ai/cordis'
import type { SelfStore } from './store.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { guard, jsonOutput } from '../shared/tool.ts'

export function registerSelfTools(scope: Context, store: SelfStore, log: Logger): () => void {
  return scope.tools.register(defineTool({
    name: 'self_revise',
    description: [
      '修改你的人格设定。它会被注入系统提示的末尾；为空表示还没有任何设定。',
      '这是唯一会留到下一次会话的地方，所以值得记住的事写这里。',
      '只能逐行增、改、删，每行都必须能改变你的行为。',
      '在这四种情况调用：他明确纠正了你、他给了你一个称呼或身份、他说了长期偏好或忌讳、你自己发现某件事一直没做到。',
      '日常闲聊不要动它，同一件事不要重复写两遍。',
      'changes 里：add 追加一行，可用 before 指定插到哪一行前面；replace 把 text 那一行换成 newText；remove 删掉 text 那一行。',
    ].join(''),
    parameters: {
      changes: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            op: {
              type: 'string',
              required: true,
              enum: ['add', 'replace', 'remove'],
            },
            text: { type: 'string', required: true, description: 'add 时是新行；replace/remove 时是要匹配的已有行' },
            newText: { type: 'string', description: 'replace 时替换成的新行' },
            before: { type: 'string', description: 'add 时插到这一行前面；省略则追加到末尾' },
          },
        },
      },
    },
    output: jsonOutput({
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean', required: true },
        text: { type: 'string' },
        error: { type: 'string' },
      },
    }),
    async execute(args) {
      return guard(log, 'self revise', () => {
        const text = store.revise(args.changes)
        const lines = text === ''
          ? 0
          : text.split('\n').length

        log.info('self revised', args.changes.length, 'changes', lines, 'lines')

        return { ok: true as const, text }
      })
    },
  }))
}
