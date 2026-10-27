// 到点了 谁要开口 投给谁 都由订阅方决定
declare module '@deepseek-ai/cordis' {
  interface Events {
    'companion/wakeup': () => void
  }
}

export {}
