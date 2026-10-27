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
