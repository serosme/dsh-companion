import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { samePath } from '../shared/workspace.ts'

export interface SelectOptions {
  readonly items: readonly SessionSummary[]
  readonly members: ReadonlySet<SessionId>
  readonly archived: ReadonlySet<SessionId>
  readonly title: string
  readonly workspacePath: string
}

export function pickTodaySession(options: SelectOptions): SessionSummary | undefined {
  const { items, members, archived, title, workspacePath } = options

  return items.find(item =>
    members.has(item.sessionId)
    && (item.cwd === undefined || samePath(item.cwd, workspacePath))
    && !archived.has(item.sessionId)
    && item.projections?.values?.title === title)
}
