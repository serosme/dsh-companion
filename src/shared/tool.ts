import type { TextBlock } from '@deepseek-ai/dsh-llm'

export function renderJson(_args: unknown, value: unknown): TextBlock[] {
  return [
    {
      type: 'text',
      text: JSON.stringify(value),
    },
  ]
}
