import type Conf from 'conf'
import type { Outbox } from '../core/outbox.ts'
import type { Reminder, RemindersData } from './store.ts'
import { randomUUID } from 'node:crypto'
import { Cron } from 'croner'
import { normalizeCron } from '../shared/cron.ts'
import { formatReminderEvent } from '../shared/events.ts'
import { formatTime, TIME_ZONE } from '../shared/time.ts'
import { openReminders } from './store.ts'

export class Reminders {
  private readonly outbox: Outbox
  private readonly conf: Conf<RemindersData>
  private readonly timers = new Map<string, Cron>()
  private readonly inFlight = new Set<string>()
  private tasks: Reminder[] = []

  constructor(workspacePath: string, outbox: Outbox) {
    this.outbox = outbox
    this.conf = openReminders(workspacePath)
  }

  get path(): string {
    return this.conf.path
  }

  get list(): readonly Reminder[] {
    return this.tasks
  }

  load(): void {
    const stored = this.conf.get('reminders')

    const kept = stored.filter((task) => {
      try {
        this.arm(task)
        return true
      }
      catch (error: unknown) {
        // 排不出下一次执行的任务永远不会再触发 留着只会越积越多
        console.warn('dropping unfireable reminder', task.id, task.cron, error)
        return false
      }
    })

    this.tasks = kept

    console.log('reminders loaded', kept.length, 'of', stored.length, 'armed', this.timers.size)

    if (kept.length !== stored.length)
      this.persist()
  }

  add(message: string, cron: string): Reminder {
    const task: Reminder = {
      id: randomUUID(),
      message,
      cron,
      status: 'pending',
      lastFireAt: '',
    }

    this.arm(task)

    this.tasks = [...this.tasks, task]
    this.persist()

    return task
  }

  cancel(id: string): boolean {
    if (!this.tasks.some(task => task.id === id))
      return false

    this.stop(id)
    this.tasks = this.tasks.filter(task => task.id !== id)
    this.persist()

    return true
  }

  nextRunAt(id: string): string | null {
    const next = this.timers.get(id)?.nextRun()
    return next == null
      ? null
      : formatTime(next.getTime())
  }

  dispose(): void {
    for (const id of [
      ...this.timers.keys(),
    ])
      this.stop(id)
  }

  private persist(): void {
    this.conf.set('reminders', this.tasks)
  }

  private arm(task: Reminder): void {
    let job: Cron

    try {
      job = new Cron(normalizeCron(task.cron), { timezone: TIME_ZONE }, () => {
        // 投递内部自己吞异常 但收尾那次落盘还可能抛 不许它变成没人接的 rejection
        void this.fire(task.id).catch((error: unknown) => {
          console.error('reminder tick failed', task.id, error)
        })
      })
    }
    catch (error: unknown) {
      throw new Error(`invalid cron ${task.cron} ${error instanceof Error
        ? error.message
        : String(error)}`)
    }

    if (job.nextRun() === null) {
      job.stop()
      throw new Error(`cron has no next run ${task.cron}`)
    }

    this.timers.set(task.id, job)
  }

  private stop(id: string): void {
    this.timers.get(id)?.stop()
    this.timers.delete(id)
  }

  // 到点 投递一次 再按结果收尾 上一次还没投完就跳过这一拍 避免重叠
  private async fire(id: string): Promise<void> {
    const task = this.tasks.find(item => item.id === id)

    if (task === undefined)
      return

    if (this.inFlight.has(id)) {
      console.log('reminder still delivering, skip tick', id)
      return
    }

    this.inFlight.add(id)

    try {
      this.settle(task, await this.deliver(task))
    }
    finally {
      this.inFlight.delete(id)
    }
  }

  private async deliver(task: Reminder): Promise<boolean> {
    // 包成提醒事件 否则到点那句话和用户刚说的话在会话里长得一样
    return await this.outbox.send(formatReminderEvent(task.message))
  }

  private settle(task: Reminder, delivered: boolean): void {
    // 没有下一拍就是最后一次 送到没送到都不该再留在列表里
    const last = (this.timers.get(task.id)?.nextRun() ?? null) === null

    if (last) {
      this.stop(task.id)
      this.tasks = this.tasks.filter(item => item.id !== task.id)
    }
    else {
      const at = formatTime(Date.now())
      this.tasks = this.tasks.map(item => item.id === task.id
        ? {
            ...item,
            status: delivered ? 'delivered' : 'failed',
            lastFireAt: at,
          }
        : item)
    }

    this.persist()

    if (delivered)
      console.log('reminder fired', task.id, task.message)
    else
      console.warn('reminder not delivered', task.id, last ? 'expired' : 'kept for retry')
  }
}
