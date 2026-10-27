import type Conf from 'conf'
import { openStore } from '../shared/conf.ts'

export interface RuntimeState {
  todaySessionId: string
  // 他自己最后一次说话 毫秒时间戳 0 表示还没有
  lastUserAt: number
  // 我最后一次产出消息 毫秒时间戳 0 表示还没有
  lastAssistantAt: number
}

// 状态文件只记跟投递有关的事实 派生数据一律现算
export function openState(workspacePath: string): Conf<RuntimeState> {
  return openStore<RuntimeState>(workspacePath, 'state', {
    todaySessionId: '',
    lastUserAt: 0,
    lastAssistantAt: 0,
  })
}
