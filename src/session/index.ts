import type { Context } from '@deepseek-ai/cordis'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Delivery } from './deliver.ts'
import { SessionId as toSessionId } from '@deepseek-ai/dsh-session'
import { parseIsoLocal, todayTitle } from '../shared/time.ts'
import { samePath } from '../shared/workspace.ts'
import { markActivity } from './activity.ts'
import { deliverPrompt, deliverToToday } from './deliver.ts'

const LIST_TIMEOUT_MS = 10_000

export interface TodaySessionOptions extends Delivery {
  // 新建会话跑的 preset 不给就用 roster 默认值
  readonly agentPreset: string
}

interface TodaySessionOutcome {
  readonly sessionId: SessionId
  readonly created: boolean
  readonly delivered: boolean
}

// 早上那次投递 有当天会话就复用 空的补一句问候 没有就建一条并记住它
export function prepareTodaySession(ctx: Context, options: TodaySessionOptions): void {
  const log = ctx.logger()

  void ensureTodaySession(ctx, options)
    .then((outcome) => {
      if (outcome === undefined)
        return

      log.info(
        'today session',
        outcome.created ? 'created' : 'reused',
        outcome.delivered ? 'delivered' : 'silent',
        outcome.sessionId,
      )

      try {
        if (options.state.get('todaySessionId') !== outcome.sessionId) {
          options.state.set('todaySessionId', outcome.sessionId)
          log.info('state todaySessionId', outcome.sessionId)
        }

        // 早上这句也算一次主动联系 不然 6:30 说完 7:00 又会唤醒一次
        if (outcome.delivered)
          markActivity(options.state)
      }
      catch (error: unknown) {
        log.error('failed to save today session state', error)
      }
    })
    .catch((error: unknown) => {
      log.error('failed to prepare today session', error)
    })
}

async function ensureTodaySession(
  ctx: Context,
  options: TodaySessionOptions,
): Promise<TodaySessionOutcome | undefined> {
  const title = todayTitle()
  const existing = await findSessionTitled(ctx, options, title)

  if (existing !== undefined) {
    if (!existing.blank)
      return { sessionId: existing.sessionId, created: false, delivered: false }

    await deliverPrompt(ctx, existing.sessionId, options.message)

    return { sessionId: existing.sessionId, created: false, delivered: true }
  }

  const { sessionId } = await ctx.sessionController.create({
    workspaceId: options.workspace.id,
    agentPreset: options.agentPreset,
  })
  await ctx.sessionController.rename({ sessionId, title })
  await deliverPrompt(ctx, sessionId, options.message)

  return { sessionId, created: true, delivered: true }
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

export interface WakeupOptions extends Delivery {
  // 距上次联系不到这么多毫秒就跳过 免得正聊着它插一句
  readonly gapMs: number
}

// 时钟事件投进当天会话 和早上那次同一个目标 同一套失败处理 所以放这里而不是单独一个模块
export function wakeTodaySession(ctx: Context, options: WakeupOptions): void {
  const log = ctx.logger()
  const last = parseIsoLocal(options.state.get('lastActivityAt')) ?? 0
  const since = Date.now() - last

  if (since < options.gapMs) {
    log.info('wakeup skipped, talked', Math.round(since / 60_000), 'min ago')
    return
  }

  void deliverToToday(ctx, options)
    .then((sessionId) => {
      if (sessionId === undefined)
        return

      markActivity(options.state)
      log.info('woke today session', sessionId)
    })
    .catch((error: unknown) => {
      log.error('failed to wake today session', error)
    })
}
