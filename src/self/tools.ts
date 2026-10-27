import type { Context, Logger } from '@deepseek-ai/cordis'
import type { LineStore } from './store.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { guard, jsonOutput } from '../shared/tool.ts'

export interface LineStores {
  readonly self: LineStore
  readonly profile: LineStore
}

export function registerSelfTools(scope: Context, stores: LineStores, log: Logger): () => void {
  return scope.tools.register(defineTool({
    name: 'self_revise',
    description: [
      '修改你的设定，会注入系统提示的末尾；为空表示还没有任何设定。',
      'target 是 self 时改关于你的：名字、自称、语气、怎么称呼他、你反复做错的事。',
      'target 是 profile 时改关于他的：姓名、作息、家人、工作、喜好、忌讳，只记长期成立的事。',
      '改已有内容用 replace 或 remove，不要用 add 叠加；新的说法和旧行冲突时，把旧行一起改掉。',
      '只能逐行增、改、删，changes 里：add 追加一行，可用 before 指定插到哪一行前面；replace 把 text 那一行换成 newText；remove 删掉 text 那一行。',
    ].join(''),
    parameters: {
      target: {
        type: 'string',
        required: true,
        enum: ['self', 'profile'],
        description: 'self 写关于你的设定 profile 写关于他的事实',
      },
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
        const store = args.target === 'profile'
          ? stores.profile
          : stores.self

        const text = store.revise(args.changes)
        const lines = text === ''
          ? 0
          : text.split('\n').length

        log.info('self revised', args.target, args.changes.length, 'changes', lines, 'lines')

        return { ok: true as const, text }
      })
    },
  }))
}
