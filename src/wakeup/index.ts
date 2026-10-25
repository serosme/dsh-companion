import type { Context } from '@deepseek-ai/cordis'
import type { TodayDeliveryOptions } from '../session/deliver.ts'
import { deliverToToday } from '../session/deliver.ts'

export interface WakeupOptions extends TodayDeliveryOptions {
  readonly signal: AbortSignal
}

export function wakeTodaySession(ctx: Context, options: WakeupOptions): void {
  void wake(ctx, options).catch((error: unknown) => {
    if (options.signal.aborted)
      return

    ctx.logger().error('failed to wake today session', error)
  })
}

async function wake(ctx: Context, options: WakeupOptions): Promise<void> {
  const sessionId = await deliverToToday(ctx, options)

  if (sessionId !== undefined)
    ctx.logger().info('woke today session', sessionId)
}
