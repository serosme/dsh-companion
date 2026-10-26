import type Conf from 'conf'
import { openStore } from '../shared/conf.ts'

export interface CompanionState {
  todaySessionId: string
}

// 状态文件只有一个事实 今天在哪个会话里
export function openState(workspacePath: string): Conf<CompanionState> {
  return openStore<CompanionState>(workspacePath, 'state', { todaySessionId: '' })
}
