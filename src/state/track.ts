import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { formatTime } from '../shared/time.ts'
import { samePath } from '../shared/workspace.ts'

export function formatMessageTime(
  session: Session,
  event: SessionEvent,
  workspacePath: string,
): string | undefined {
  if (event.type !== 'user/message' || event.data.source?.kind !== 'user')
    return undefined

  const cwd = session.header.cwd
  if (cwd === undefined || !samePath(cwd, workspacePath))
    return undefined

  return formatTime(event.time)
}
