import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from './state.ts'
import { formatIsoLocal } from '../shared/time.ts'
import { samePath } from '../shared/workspace.ts'

// 连续几条消息没必要条条写盘 门槛按分钟算 差几秒无所谓
const WRITE_GAP_MS = 5_000

let lastWrite = 0

// 会话里真的有人说话时记一笔 唤醒靠它判断是不是刚聊过
// ctx.on 本身就是随插件执行域释放的 不用再包一层 effect
export function attachActivity(
  ctx: Context,
  workspace: Workspace,
  state: Conf<CompanionState>,
): void {
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'user/message' || event.data.source?.kind !== 'user')
      return

    const cwd = session.header.cwd
    if (cwd === undefined || !samePath(cwd, workspace.path))
      return

    markActivity(state)
  })
}

// 人说话和我们主动开口都算 一次联系
export function markActivity(state: Conf<CompanionState>): void {
  const now = Date.now()

  if (now - lastWrite < WRITE_GAP_MS)
    return

  lastWrite = now
  state.set('lastActivityAt', formatIsoLocal(now))
}
