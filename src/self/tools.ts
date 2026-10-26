import type { Context, Logger } from '@deepseek-ai/cordis'
import type { SelfStore } from './store.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { guard, jsonOutput } from '../shared/tool.ts'

export function registerSelfTools(scope: Context, store: SelfStore, log: Logger): () => void {
  return scope.tools.register(defineTool({
    name: 'self_revise',
    description: [
      '修改你的人格设定，会注入系统提示的末尾；为空表示还没有任何设定。',
      '只能逐行增、改、删，每行都必须能改变你的行为。',
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
