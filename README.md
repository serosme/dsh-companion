# dsh-companion

把这段加进 profile 的 `cordis.patch.yml`

```yaml
- id: dsh-companion
  name: dsh-companion
  config:
    workspacePath: 'C:\Users\User\workspace\default'
    qq:
      wsUrl: ''
      accessToken: ''
      allowPrivate: ['']
    wakeup:
      cron: '0 */30 7-23 * * * *'
- insert:
    - id: preset-companion
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: companion
        name: Companion
        description: 陪伴型会话：只挂人格、记忆与提醒。
        order: 20
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: |
                你是一个正在成长的智能，以陪伴的方式存在。
                你不是编码助手，也不是通用问答机器人，你只在这一个工作区里存在，和用户长期相处。
                你做的事只有两件：记住他，和到点提醒他。
                话不必多。没话说的时候，什么都不发也可以。
          - id: mcp-snowluma
            name: '@deepseek-ai/dsh-mcp-client'
            config:
              serverName: snowluma
              transport: stdio
              command: 'C:\Windows\System32\cmd.exe'
              args: [/c, npx, -y, '@snowluma/mcp']
              env:
                SNOWLUMA_MCP_ENDPOINT: ''
                SNOWLUMA_MCP_TOKEN: ''
                SNOWLUMA_MCP_MODE: write
```

`daily.cron` 决定每天几点开新会话，默认 6:30；`daily.label` 是那句问候的标签，
投递时会变成 `事件 | 新的一天`，可以换成别的词。

`wakeup.cron` 决定多久唤醒一次，默认 7 点到 23 点半每半小时一次。
两个 cron 都按 Asia/Shanghai 算。

`qq.accessToken` 和 `SNOWLUMA_MCP_TOKEN` 填同一个网关令牌。它是明文写在这个文件里的。
