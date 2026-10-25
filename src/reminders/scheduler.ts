import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../state/store.ts'
import type { Reminder, RemindersData } from './store.ts'
import { randomUUID } from 'node:crypto'
import { Cron } from 'croner'
import { deliverToToday } from '../session/deliver.ts'
import { normalizeCron } from '../shared/cron.ts'
import { formatTime, TIME_ZONE } from '../shared/time.ts'
import { openReminders } from './store.ts'

export class Reminders {
  private readonly ctx: Context
  private readonly workspace: Workspace
  private readonly state: Conf<CompanionState>
  private readonly conf: Conf<RemindersData>
  private readonly timers = new Map<string, Cron>()
  private tasks: Reminder[] = []

  constructor(ctx: Context, workspace: Workspace, state: Conf<CompanionState>) {
    this.ctx = ctx
    this.workspace = workspace
    this.state = state
    this.conf = openReminders(workspace.path)
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
      catch {
        return task.status === 'failed'
      }
    })

    this.tasks = kept

    this.ctx.logger().info('reminders loaded', kept.length, 'of', stored.length, 'armed', this.timers.size)

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
        void this.fire(task.id)
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

  private async fire(id: string): Promise<void> {
    const log = this.ctx.logger()
    const task = this.tasks.find(item => item.id === id)

    if (task === undefined)
      return

    let delivered = false

    try {
      delivered = await deliverToToday(this.ctx, {
        workspace: this.workspace,
        state: this.state,
        message: task.message,
      }) !== undefined
    }
    catch (error: unknown) {
      log.error('failed to fire reminder', id, error)
    }

    const exhausted = delivered && this.timers.get(id)?.nextRun() === null

    if (exhausted) {
      this.stop(id)
      this.tasks = this.tasks.filter(item => item.id !== id)
    }
    else {
      const at = formatTime(Date.now())
      this.tasks = this.tasks.map(item => item.id === id
        ? {
            ...item,
            status: delivered ? 'delivered' : 'failed',
            lastFireAt: at,
          }
        : item)
    }

    this.persist()

    if (delivered)
      log.info('reminder fired', id, task.message)
    else
      log.info('reminder not delivered, kept for retry', id)
  }
}
