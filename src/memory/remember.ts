import type { Context } from '@deepseek-ai/cordis'
import type { LineStore } from './lines.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { jsonOutput } from '../shared/tool.ts'

export interface LineStores {
  readonly self: LineStore
  readonly him: LineStore
}

export function registerRememberTool(scope: Context, stores: LineStores): () => void {
  return scope.tools.register(defineTool({
    name: 'remember',
    description: [
      '把值得留下的事记下来，会注入系统提示的末尾；空表示还没记过。',
      'target 是 self 时记关于你的：名字、自称、语气、怎么称呼他、你反复做错的事。',
      'target 是 him 时记关于他的：姓名、作息、家人、工作、喜好、忌讳，只记长期成立的事。',
      '改已有内容用 replace 或 remove，不要用 add 叠加；新的说法和旧行冲突时，把旧行一起改掉。',
      '只能逐行增、改、删，changes 里：add 追加一行，可用 before 指定插到哪一行前面；replace 把 text 那一行换成 newText；remove 删掉 text 那一行。',
    ].join(''),
    parameters: {
      target: {
        type: 'string',
        required: true,
        enum: ['self', 'him'],
        description: 'self 记关于你的 him 记关于他的',
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
      },
    }),
    async execute(args) {
      const store = args.target === 'him'
        ? stores.him
        : stores.self

      // 行匹配不上就在这里抛 由宿主把原因转成错误结果交给模型
      const text = store.revise(args.changes)
      const lines = text === ''
        ? 0
        : text.split('\n').length

      console.log('remembered', args.target, args.changes.length, 'changes', lines, 'lines')

      return { ok: true as const, text }
    },
  }))
}
