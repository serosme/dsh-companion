import type { Context } from '@deepseek-ai/cordis'
import { format } from 'node:util'

export function attachLogger(ctx: Context): void {
  const { name } = ctx.logger()

  ctx.effect(() => ctx.logger.exporter({
    levels: { default: Number.POSITIVE_INFINITY },
    export: (message) => {
      if (message.name !== name)
        return

      console.log(`[${name}] ${format(...message.args)}`)
    },
  }))
}
