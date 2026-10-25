import type { Context } from '@deepseek-ai/cordis'
import { format } from 'node:util'

const ALL_LEVELS = Number.POSITIVE_INFINITY

export function attachLogger(ctx: Context): void {
  const { name } = ctx.logger()

  ctx.effect(() => ctx.logger.exporter({
    levels: { default: ALL_LEVELS },
    export: (message) => {
      if (message.name !== name)
        return

      console.log(`[${name}] ${format(...message.args)}`)
    },
  }))
}
