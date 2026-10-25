import Conf from 'conf'

export type ReminderStatus = 'pending' | 'delivered' | 'failed'

export interface Reminder {
  id: string
  message: string
  cron: string
  status: ReminderStatus
  lastFireAt: string
}

export interface RemindersData {
  reminders: Reminder[]
}

export function openReminders(workspacePath: string): Conf<RemindersData> {
  return new Conf<RemindersData>({
    cwd: workspacePath,
    configName: 'reminders',
    defaults: {
      reminders: [],
    },
  })
}
