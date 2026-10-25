import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'

export async function deliverPrompt(ctx: Context, sessionId: SessionId, text: string): Promise<void> {
  const resolved = await ctx.sessionController.resolveAgent(sessionId)
  if ('error' in resolved)
    throw new Error(`${resolved.error.code} ${resolved.error.message}`)

  resolved.agent.followup(createUserMessage({
    content: [
      { type: 'text', text },
    ],
    source: { kind: 'user' },
  }))
}
