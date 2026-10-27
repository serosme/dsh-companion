import { openStore } from '../shared/conf.ts'

interface LineChange {
  readonly op: 'add' | 'replace' | 'remove'
  readonly text: string
  readonly newText?: string
  readonly before?: string
}

interface LineData {
  lines: string[]
}

export interface LineStore {
  render: () => string
  revise: (changes: readonly LineChange[]) => string
}

// 一份设定就是工作区里的一个 JSON 文件 self 和 him 共用这套读写
// 挂载时各开一次 render 每个请求都会调用 不必每次现开
export function createLineStore(workspacePath: string, configName: string): LineStore {
  const conf = openStore<LineData>(workspacePath, configName, { lines: [] })

  return {
    render: () => conf.get('lines').join('\n'),
    revise: (changes) => {
      const next = applyChanges(conf.get('lines'), changes, configName)

      conf.set('lines', next)

      return next.join('\n')
    },
  }
}

function applyChanges(
  lines: readonly string[],
  changes: readonly LineChange[],
  configName: string,
): string[] {
  const next = [...lines]

  for (const change of changes) {
    if (change.op === 'add') {
      insertLine(next, change, configName)
      continue
    }

    const index = next.indexOf(change.text)

    if (index === -1)
      throw new Error(`${configName} has no line ${change.text}`)

    if (change.op === 'replace') {
      if (change.newText === undefined || change.newText.trim() === '')
        throw new Error('replace needs a non-empty newText')

      next[index] = change.newText
      continue
    }

    next.splice(index, 1)
  }

  return next
}

function insertLine(lines: string[], change: LineChange, configName: string): void {
  if (change.text.trim() === '')
    throw new Error('line cannot be empty')

  if (change.before === undefined) {
    lines.push(change.text)
    return
  }

  const index = lines.indexOf(change.before)

  if (index === -1)
    throw new Error(`${configName} has no line ${change.before}`)

  lines.splice(index, 0, change.text)
}
