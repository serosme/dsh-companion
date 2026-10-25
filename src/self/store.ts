import Conf from 'conf'

export interface SelfChange {
  readonly op: 'add' | 'replace' | 'remove'
  readonly text: string
  readonly newText?: string
  readonly before?: string
}

export interface SelfData {
  lines: string[]
}

function openSelf(workspacePath: string): Conf<SelfData> {
  return new Conf<SelfData>({
    cwd: workspacePath,
    configName: 'self',
    defaults: {
      lines: [],
    },
  })
}

export function renderSelf(workspacePath: string): string {
  return openSelf(workspacePath).get('lines').join('\n')
}

export function reviseSelf(workspacePath: string, changes: readonly SelfChange[]): string {
  const conf = openSelf(workspacePath)
  const next = applyChanges(conf.get('lines'), changes)

  conf.set('lines', next)

  return next.join('\n')
}

function applyChanges(lines: readonly string[], changes: readonly SelfChange[]): string[] {
  const next = [...lines]

  for (const change of changes) {
    if (change.op === 'add') {
      insertLine(next, change)
      continue
    }

    const index = next.indexOf(change.text)

    if (index === -1)
      throw new Error(`self has no line ${change.text}`)

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

function insertLine(lines: string[], change: SelfChange): void {
  if (change.text.trim() === '')
    throw new Error('self line cannot be empty')

  if (change.before === undefined) {
    lines.push(change.text)
    return
  }

  const index = lines.indexOf(change.before)

  if (index === -1)
    throw new Error(`self has no line ${change.before}`)

  lines.splice(index, 0, change.text)
}
