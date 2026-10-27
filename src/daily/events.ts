// 一天开始了 该把今天那条会话准备好
declare module '@deepseek-ai/cordis' {
  interface Events {
    'self/daily': () => void
  }
}

export {}
