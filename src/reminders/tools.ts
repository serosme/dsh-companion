import type { Context, Logger } from '@deepseek-ai/cordis'
import type { Reminders } from './scheduler.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { guard, jsonOutput } from '../shared/tool.ts'

export function registerReminderTools(scope: Context, reminders: Reminders, log: Logger): () => void {
  const disposers = [
    scope.tools.register(defineTool({
      name: 'reminder_create',
      description: [
        '给自己留一个定时提醒。到点会把这句话投进今天的会话，由那时的你决定怎么开口。',
        'message 要写成给未来的自己看的话，不要写成发给他的通知。比如写成：他上午让你下午三点提醒他开会。现在到点了。',
        'cron 支持秒和年：一次性写成 0 0 15 25 10 * 2026 表示 2026 年 10 月 25 日 15:00，每天写成 0 0 9 * * *。',
      ].join(''),
      parameters: {
        cron: { type: 'string', required: true, description: 'cron 表达式，秒和年可选' },
        message: { type: 'string', required: true, description: '到点投进会话的那句话' },
      },
      output: jsonOutput({
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          id: { type: 'string' },
          nextRunAt: { type: 'string' },
          error: { type: 'string' },
        },
      }),
      async execute(args) {
        return guard(log, 'reminder create', () => {
          const task = reminders.add(args.message, args.cron)
          const next = reminders.nextRunAt(task.id)

          log.info('reminder created', task.id, task.cron, 'next', next ?? '-')

          return {
            ok: true as const,
            id: task.id,
            ...(next === null
              ? {}
              : { nextRunAt: next }),
          }
        })
      },
    })),

    scope.tools.register(defineTool({
      name: 'reminder_list',
      description: '列出自己还有哪些提醒任务。',
      parameters: {},
      output: jsonOutput({
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
      }),
      async execute() {
        log.info('reminder list', reminders.list.length)

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
      output: jsonOutput({
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
        },
      }),
      async execute(args) {
        const cancelled = reminders.cancel(args.id)

        if (cancelled)
          log.info('reminder cancelled', args.id)
        else
          log.warn('reminder cancel missed', args.id)

        return { ok: cancelled }
      },
    })),
  ]

  return () => {
    for (const dispose of disposers)
      dispose()
  }
}
