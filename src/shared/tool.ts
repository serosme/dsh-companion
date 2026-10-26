import type { Logger } from '@deepseek-ai/cordis'
import type { TextBlock } from '@deepseek-ai/dsh-llm'
import type { ValueSchemaSpec } from '@deepseek-ai/dsh-tools'

function renderJson(_args: unknown, value: unknown): TextBlock[] {
  return [
    {
      type: 'text',
      text: JSON.stringify(value),
    },
  ]
}

// 所有工具都按 JSON 回话 只差一份 schema
export function jsonOutput<S extends ValueSchemaSpec>(schema: S): { schema: S, render: typeof renderJson } {
  return { schema, render: renderJson }
}

// 工具体的统一失败形状 记日志 把原因交回模型 别让异常冒到调用栈上
export function guard<R extends object>(
  log: Logger,
  what: string,
  run: () => R,
): R | { ok: false, error: string } {
  try {
    return run()
  }
  catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : String(error)

    log.warn(what, 'failed', message)

    return { ok: false, error: message }
  }
}
