import type Conf from 'conf'
import { openStore } from '../shared/conf.ts'

export interface CompanionState {
  todaySessionId: string
  // 上次有人说话或我们主动联系的时间 形如 2026-10-27T10:29:28+08:00
  lastActivityAt: string
}

// 状态文件只记两件事 今天在哪个会话里 上次说话是什么时候
export function openState(workspacePath: string): Conf<CompanionState> {
  return openStore<CompanionState>(workspacePath, 'state', {
    todaySessionId: '',
    lastActivityAt: '',
  })
}
