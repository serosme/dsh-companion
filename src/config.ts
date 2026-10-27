import Schema from '@deepseek-ai/schemastery'

export const Config = Schema.object({
  workspacePath: Schema.string()
    .required()
    .pattern(/\S/),
  // 陪伴跑的 agent preset 工具面由 preset 决定 所以建会话时必须显式指定 不能吃 roster 默认值
  agentPreset: Schema.string()
    .default('companion')
    .pattern(/\S/),
  daily: Schema.object({
    cron: Schema.string()
      .default('0 30 6 * * ? *'),
    // 这里是事件标签 不是一句话 投递时会包成 `事件 | label` 加日期 改词不会破坏信封
    label: Schema.string()
      .default('新的一天')
      .pattern(/\S/),
  }),
  wakeup: Schema.object({
    cron: Schema.string()
      .default('0 */30 7-23,0-2 * * ? *'),
    label: Schema.string()
      .default('主动唤醒')
      .pattern(/\S/),
    // 距上次说话不到这么多分钟就不唤醒 免得你们正聊着它插一句
    gapMinutes: Schema.number()
      .default(30),
  }),
  qq: Schema.object({
    // 不填 wsUrl 或 allowPrivate 就整块跳过 不连 socket
    wsUrl: Schema.string()
      .default(''),
    accessToken: Schema.string()
      .default(''),
    // 只收这些 QQ 号的私聊
    allowPrivate: Schema.array(Schema.string())
      .default([]),
  }),
})

export type ConfigValue = ReturnType<typeof Config>
