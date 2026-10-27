import type { Context } from '@deepseek-ai/cordis'

export interface SocketOptions {
  readonly url: string
  readonly token: string
  readonly onEvent: (event: unknown) => void
}

const RETRY_MIN_MS = 1_000
const RETRY_MAX_MS = 30_000

// 连上就听着 断了按退避重连 插件卸载时连同定时器一起收掉
export function connectSocket(ctx: Context, options: SocketOptions): void {
  let socket: WebSocket | undefined
  let retry = 0
  let timer: NodeJS.Timeout | undefined
  let closed = false

  const schedule = (): void => {
    if (closed)
      return

    const delay = Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** retry)
    retry++
    console.warn('qq socket closed, retry in', delay, 'ms')

    timer = setTimeout(open, delay)
  }

  function open(): void {
    if (closed)
      return

    socket = new WebSocket(withToken(options.url, options.token))

    socket.addEventListener('open', () => {
      retry = 0
      console.log('qq socket open', options.url)
    })

    socket.addEventListener('message', (message) => {
      try {
        options.onEvent(JSON.parse(String(message.data)))
      }
      catch (error: unknown) {
        console.warn('qq event dropped, not json', error)
      }
    })

    socket.addEventListener('close', () => {
      schedule()
    })

    // 出错之后 close 未必会来 主动关一次让它走同一条重连路径
    socket.addEventListener('error', () => {
      socket?.close()
    })
  }

  ctx.effect(() => {
    open()

    return () => {
      closed = true
      clearTimeout(timer)
      socket?.close()
    }
  }, 'dsh-companion:qq-socket')
}

// OneBot 的 WS 用 query 传令牌 Node 自带的 WebSocket 也能用 不必引 ws 包
function withToken(url: string, token: string): string {
  if (token === '')
    return url

  const separator = url.includes('?')
    ? '&'
    : '?'

  return `${url}${separator}access_token=${encodeURIComponent(token)}`
}
