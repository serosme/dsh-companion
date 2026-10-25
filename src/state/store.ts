import Conf from 'conf'

export interface CompanionState {
  todaySessionId: string
  lastMessageAt: string
}

export function openState(workspacePath: string): Conf<CompanionState> {
  return new Conf<CompanionState>({
    cwd: workspacePath,
    configName: 'state',
    defaults: {
      todaySessionId: '',
      lastMessageAt: '',
    },
  })
}
