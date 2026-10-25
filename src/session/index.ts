import type { Context } from '@deepseek-ai/cordis'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { todayTitle } from '../shared/time.ts'
import { deliverPrompt } from './deliver.ts'
import { pickTodaySession } from './select.ts'

const LIST_TIMEOUT_MS = 10_000

export interface TodaySessionOptions {
  readonly workspace: Workspace
  readonly message: string
  readonly signal: AbortSignal
}

export interface TodaySessionOutcome {
  readonly sessionId: SessionId
  readonly created: boolean
}

export function prepareTodaySession(ctx: Context, options: TodaySessionOptions): void {
  const log = ctx.logger()

  void ensureTodaySession(ctx, options)
    .then((outcome) => {
      if (options.signal.aborted)
        return

      if (outcome === undefined) {
        log.info('today session already exists')
        return
      }

      log.info(
        outcome.created ? 'created today session' : 'greeted blank today session',
        outcome.sessionId,
      )
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
      return undefined

    await deliverPrompt(ctx, existing.sessionId, options.message)

    return { sessionId: existing.sessionId, created: false }
  }

  if (options.signal.aborted)
    return undefined

  const { sessionId } = await ctx.sessionController.create({ workspaceId: options.workspace.id })
  await ctx.sessionController.rename({ sessionId, title })
  await deliverPrompt(ctx, sessionId, options.message)

  return { sessionId, created: true }
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
