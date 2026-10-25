import type { Context } from '@deepseek-ai/cordis'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../state/store.ts'
import { todayTitle } from '../shared/time.ts'
import { deliverPrompt } from './deliver.ts'
import { pickTodaySession } from './select.ts'

const LIST_TIMEOUT_MS = 10_000

export interface TodaySessionOptions {
  readonly workspace: Workspace
  readonly message: string
  readonly signal: AbortSignal
  readonly state: Conf<CompanionState>
}

export interface TodaySessionOutcome {
  readonly sessionId: SessionId
  readonly action: 'created' | 'greeted' | 'exists'
}

export function prepareTodaySession(ctx: Context, options: TodaySessionOptions): void {
  const log = ctx.logger()

  void ensureTodaySession(ctx, options)
    .then((outcome) => {
      if (outcome === undefined)
        return

      log.info('today session', outcome.action, outcome.sessionId)

      try {
        if (options.state.get('todaySessionId') !== outcome.sessionId) {
          options.state.set('todaySessionId', outcome.sessionId)
          log.info('state todaySessionId', outcome.sessionId)
        }
      }
      catch (error: unknown) {
        log.error('failed to save state todaySessionId', error)
      }
    })
    .catch((error: unknown) => {
      if (options.signal.aborted)
        return

      log.error('failed to prepare today session', error)
    })
}

export async function ensureTodaySession(
  ctx: Context,
  options: TodaySessionOptions,
): Promise<TodaySessionOutcome | undefined> {
  const title = todayTitle()

  if (options.signal.aborted)
    return undefined

  const existing = await findSessionTitled(ctx, options, title)

  if (existing !== undefined) {
    if (!existing.blank)
      return { sessionId: existing.sessionId, action: 'exists' }

    await deliverPrompt(ctx, existing.sessionId, options.message)

    return { sessionId: existing.sessionId, action: 'greeted' }
  }

  if (options.signal.aborted)
    return undefined

  const { sessionId } = await ctx.sessionController.create({ workspaceId: options.workspace.id })
  await ctx.sessionController.rename({ sessionId, title })
  await deliverPrompt(ctx, sessionId, options.message)

  return { sessionId, action: 'created' }
}

async function findSessionTitled(
  ctx: Context,
  options: TodaySessionOptions,
  title: string,
): Promise<SessionSummary | undefined> {
  const signal = AbortSignal.any([
    options.signal,
    AbortSignal.timeout(LIST_TIMEOUT_MS),
  ])
  const { items } = await ctx.sessionController.list({}, signal)
  const members = new Set(options.workspace.sessionIds)
  const archived = new Set(ctx.workspaceRegistry.archivedSessionIds)

  return pickTodaySession({
    items,
    members,
    archived,
    title,
    workspacePath: options.workspace.path,
  })
}
