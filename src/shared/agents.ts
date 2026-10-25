import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { samePath } from './workspace.ts'

export function attachWorkspaceAgents(
  ctx: Context,
  workspace: Workspace,
  attach: (agent: Agent) => void,
): void {
  const attachAgent = (agent: Agent): void => {
    const cwd = agent.session.header.cwd
    if (cwd === undefined || !samePath(cwd, workspace.path))
      return

    attach(agent)
  }

  ctx.on('agent/created', ({ agent }) => {
    attachAgent(agent)
  })

  for (const agent of ctx.agents.list())
    attachAgent(agent)
}
