import type { Context, Logger } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { renderJson } from '../shared/tool.ts'
import { reviseSelf } from './store.ts'

export function registerSelfTools(scope: Context, workspace: Workspace, log: Logger): () => void {
  return scope.tools.register(defineTool({
    name: 'self_revise',
    description: [
      '修改你的人格设定。它会被注入系统提示的末尾；为空表示还没有任何设定。',
      '只能逐行增、改、删，每行都必须能改变你的行为。',
      '只在这三种情况调用：他明确纠正了你、每周回顾、你自己发现某件事一直没做到。其余时候不要动。',
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
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          text: { type: 'string' },
          error: { type: 'string' },
        },
      },
      render: renderJson,
    },
    async execute(args) {
      try {
        const text = reviseSelf(workspace.path, args.changes)
        const lines = text === ''
          ? 0
          : text.split('\n').length

        log.info('self revised', args.changes.length, 'changes', lines, 'lines')

        return { ok: true, text }
      }
      catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : String(error)

        log.warn('self revise failed', message)

        return { ok: false, error: message }
      }
    },
  }))
}
