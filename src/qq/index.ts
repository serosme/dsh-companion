import type { Context } from '@deepseek-ai/cordis'
import type { Outbox } from '../core/outbox.ts'
import { formatInbound, normalizeAllow, readPrivateMessage } from './inbound.ts'
import { connectSocket } from './socket.ts'

export interface QqConfig {
  readonly wsUrl: string
  readonly accessToken: string
  readonly allowPrivate: readonly string[]
}

export interface QqOptions {
  readonly outbox: Outbox
  readonly config: QqConfig
}

// 没配 wsUrl 或白名单为空就整块跳过 和没装这个能力一样
export function attachQq(ctx: Context, options: QqOptions): void {
  const { wsUrl } = options.config
  const allowPrivate = normalizeAllow(options.config.allowPrivate)

  if (wsUrl.trim() === '' || allowPrivate.length === 0) {
    console.log('qq skipped, wsUrl or allowPrivate not configured')
    return
  }

  const allow = new Set(allowPrivate)

  connectSocket(ctx, {
    url: wsUrl,
    token: options.config.accessToken,
    onEvent: (event) => {
      const inbound = readPrivateMessage(event, allow)
      if (inbound === undefined)
        return

      // 来自 QQ 的消息标上自己的来源 历史里能看出不是这里说的
      void options.outbox.send(formatInbound(inbound), { kind: 'qq' })
        .then((delivered) => {
          if (!delivered)
            console.warn('qq message dropped, no today session', inbound.userId)
        })
    },
  })

  console.log('qq listening for private messages from', allowPrivate.join(', '))
}
