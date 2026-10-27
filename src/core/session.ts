import type { Context } from '@deepseek-ai/cordis'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from './state.ts'
import { SessionId as toSessionId } from '@deepseek-ai/dsh-session'
import { todayTitle } from '../shared/time.ts'
import { samePath } from '../shared/workspace.ts'

const LIST_TIMEOUT_MS = 10_000

export interface TodaySessionOptions {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
  // 新建会话跑的 preset 不给就用 roster 默认值
  readonly agentPreset: string
}

export interface TodaySessionOutcome {
  readonly sessionId: SessionId
  readonly created: boolean
  // 这条会话还没说过话 该补一句问候
  readonly blank: boolean
}

// 找今天那条会话 没有就建一条并改名 只负责把会话准备好 投递交给 outbox
export async function ensureTodaySession(
  ctx: Context,
  options: TodaySessionOptions,
): Promise<TodaySessionOutcome> {
  const title = todayTitle()
  const existing = await findSessionTitled(ctx, options, title)

  if (existing !== undefined)
    return { sessionId: existing.sessionId, created: false, blank: existing.blank }

  const { sessionId } = await ctx.sessionController.create({
    workspaceId: options.workspace.id,
    agentPreset: options.agentPreset,
  })
  await ctx.sessionController.rename({ sessionId, title })

  return { sessionId, created: true, blank: true }
}

async function findSessionTitled(
  ctx: Context,
  options: TodaySessionOptions,
  title: string,
): Promise<SessionSummary | undefined> {
  const { items } = await ctx.sessionController.list({}, AbortSignal.timeout(LIST_TIMEOUT_MS))
  const members = new Set(options.workspace.sessionIds)
  const archived = new Set(ctx.workspaceRegistry.archivedSessionIds)

  return pickTodaySession({
    items,
    members,
    archived,
    title,
    workspacePath: options.workspace.path,
    preferredId: toSessionId(options.state.get('todaySessionId')),
  })
}

interface SelectOptions {
  readonly items: readonly SessionSummary[]
  readonly members: ReadonlySet<SessionId>
  readonly archived: ReadonlySet<SessionId>
  readonly title: string
  readonly workspacePath: string
  // state 里记着的当天会话 同名会话不止一条时它优先
  readonly preferredId?: SessionId
}

// 标题不唯一 重启后可能同时存在两条同标题的会话 所以用记下来的 id 破平 而不是取列表第一个
function pickTodaySession(options: SelectOptions): SessionSummary | undefined {
  const { items, members, archived, title, workspacePath, preferredId } = options

  const candidates = items.filter(item =>
    members.has(item.sessionId)
    && (item.cwd === undefined || samePath(item.cwd, workspacePath))
    && !archived.has(item.sessionId)
    && item.projections?.values?.title === title)

  return candidates.find(item => item.sessionId === preferredId) ?? candidates[0]
}
