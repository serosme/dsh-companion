import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import type Conf from 'conf'
import type { CompanionState } from '../session/state.ts'
import { deliverToToday } from '../session/deliver.ts'
import { formatInbound, normalizeAllow, readPrivateMessage } from './inbound.ts'
import { connectSocket } from './socket.ts'

export interface QqConfig {
  readonly wsUrl: string
  readonly accessToken: string
  readonly allowPrivate: readonly string[]
}

export interface QqOptions {
  readonly workspace: Workspace
  readonly state: Conf<CompanionState>
  readonly config: QqConfig
}

// 没配 wsUrl 或白名单为空就整块跳过 和没装这个能力一样
export function attachQq(ctx: Context, options: QqOptions): void {
  const log = ctx.logger()
  const { wsUrl } = options.config
  const allowPrivate = normalizeAllow(options.config.allowPrivate)

  if (wsUrl.trim() === '' || allowPrivate.length === 0) {
    log.info('qq skipped, wsUrl or allowPrivate not configured')
    return
  }

  const allow = new Set(allowPrivate)

  connectSocket(ctx, {
    url: wsUrl,
    token: options.config.accessToken,
    log,
    onEvent: (event) => {
      const inbound = readPrivateMessage(event, allow)
      if (inbound === undefined)
        return

      void deliverToToday(ctx, {
        workspace: options.workspace,
        state: options.state,
        source: { kind: 'qq' },
        message: formatInbound(inbound),
      })
        .then((sessionId) => {
          if (sessionId === undefined)
            log.warn('qq message dropped, no today session', inbound.userId)
        })
        .catch((error: unknown) => {
          log.error('qq message delivery failed', error)
        })
    },
  })

  log.info('qq listening for private messages from', allowPrivate.join(', '))
}
