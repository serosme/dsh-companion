import type { Context } from '@deepseek-ai/cordis'
import type { TextBlock } from '@deepseek-ai/dsh-llm'
import type { Reminders } from './scheduler.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'

function renderJson(_args: unknown, value: unknown): TextBlock[] {
  return [
    {
      type: 'text',
      text: JSON.stringify(value),
    },
  ]
}

export function registerReminderTools(scope: Context, reminders: Reminders): () => void {
  const disposers = [
    scope.tools.register(defineTool({
      name: 'reminder_create',
      description: [
        '给自己留一个定时提醒。到点会把这句话投进今天的会话，由那时的你决定怎么开口。',
        'message 要写成给未来的自己看的话，例如「他上午让你下午三点提醒他开会。现在到点了。」，不要写成发给他的通知。',
        'cron 支持秒和年：一次性写「0 0 15 25 10 * 2026」（2026 年 10 月 25 日 15:00），每天写「0 0 9 * * *」。',
      ].join(''),
      parameters: {
        cron: { type: 'string', required: true, description: 'cron 表达式，秒和年可选' },
        message: { type: 'string', required: true, description: '到点投进会话的那句话' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            id: { type: 'string' },
            nextRunAt: { type: 'string' },
            error: { type: 'string' },
          },
        },
        render: renderJson,
      },
      async execute(args) {
        try {
          const task = reminders.add(args.message, args.cron)
          const next = reminders.nextRunAt(task.id)
          return {
            ok: true,
            id: task.id,
            ...(next === null
              ? {}
              : { nextRunAt: next }),
          }
        }
        catch (error: unknown) {
          return {
            ok: false,
            error: error instanceof Error
              ? error.message
              : String(error),
          }
        }
      },
    })),

    scope.tools.register(defineTool({
      name: 'reminder_list',
      description: '列出自己还有哪些提醒任务。',
      parameters: {},
      output: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              message: { type: 'string', required: true },
              cron: { type: 'string', required: true },
              status: { type: 'string', required: true },
              lastFireAt: { type: 'string' },
              nextRunAt: { type: 'string' },
            },
          },
        },
        render: renderJson,
      },
      async execute() {
        return reminders.list.map((task) => {
          const next = reminders.nextRunAt(task.id)
          return {
            id: task.id,
            message: task.message,
            cron: task.cron,
            status: task.status,
            ...(task.lastFireAt === ''
              ? {}
              : { lastFireAt: task.lastFireAt }),
            ...(next === null
              ? {}
              : { nextRunAt: next }),
          }
        })
      },
    })),

    scope.tools.register(defineTool({
      name: 'reminder_cancel',
      description: '取消一个提醒任务。',
      parameters: {
        id: { type: 'string', required: true, description: 'reminder_list 返回的 id' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
          },
        },
        render: renderJson,
      },
      async execute(args) {
        return {
          ok: reminders.cancel(args.id),
        }
      },
    })),
  ]

  return () => {
    for (const dispose of disposers)
      dispose()
  }
}
