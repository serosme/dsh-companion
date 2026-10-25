import type { Context } from '@deepseek-ai/cordis'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { resolve } from 'node:path'
import process from 'node:process'

function normalize(path: string): string {
  const resolved = resolve(path).replace(/[\\/]+$/, '')
  return process.platform === 'win32'
    ? resolved.toLowerCase()
    : resolved
}

export function samePath(a: string, b: string): boolean {
  return normalize(a) === normalize(b)
}

export function requireWorkspace(ctx: Context, workspacePath: string): Workspace {
  const path = workspacePath.trim()

  const workspace = ctx.workspaceRegistry.list().find(item => samePath(item.path, path))
  if (workspace === undefined)
    throw new Error(`workspacePath ${path} is not a registered workspace`)

  return workspace
}
