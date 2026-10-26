import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { samePath } from './workspace.ts'

// 对工作区里的每个 agent 跑一次 attach 已有的和之后创建的
// 四个模块各调一次是有意的 彼此不读对方的注册 顺序不构成契约 各自可增可删
// 等哪天某条注册依赖另一条先跑 再收成显式编排
export function attachWorkspaceAgents(
  ctx: Context,
  workspace: Workspace,
  attach: (agent: Agent) => void,
): void {
// 同一个 agent 只挂一次 list() 与 created 事件可能指向同一个刚创建的 agent
  const attached = new WeakSet<Agent>()

  const attachAgent = (agent: Agent): void => {
    const cwd = agent.session.header.cwd
    if (cwd === undefined || !samePath(cwd, workspace.path))
      return
    if (attached.has(agent))
      return

    attached.add(agent)
    attach(agent)
  }

  // ctx.on 本身就是随插件执行域一起释放的 热重载不会留下监听
  ctx.on('agent/created', ({ agent }) => {
    attachAgent(agent)
  })

  for (const agent of ctx.agents.list())
    attachAgent(agent)
}
