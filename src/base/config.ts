import Schema from '@deepseek-ai/schemastery'

export const Config = Schema.object({
  workspacePath: Schema.string()
    .required()
    .pattern(/\S/),
  daily: Schema.object({
    cron: Schema.string()
      .default('0 30 6 * * ? *'),
    message: Schema.string()
      .default('新的一天')
      .pattern(/\S/),
  }),
  wakeup: Schema.object({
    cron: Schema.string()
      .default('0 */30 7-23,0-2 * * ? *'),
    message: Schema.string()
      .default('在吗')
      .pattern(/\S/),
  }),
})

export type ConfigValue = ReturnType<typeof Config>
