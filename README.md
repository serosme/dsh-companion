# dsh-companion

把这段加进 profile 的 `cordis.patch.yml`

```yaml
- id: dsh-companion
  name: dsh-companion
  config:
    workspacePath: 'C:\Users\User\workspace\default'
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
```

`daily.label` 和 `wakeup.label` 可以改，改完要同步插件的协议段。

协议段在 `src/prompt.ts`，里面写死了 `新的一天`、`主动唤醒`、`提醒` 三个标签；`提醒` 改不了。
