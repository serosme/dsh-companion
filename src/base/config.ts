import Schema from '@deepseek-ai/schemastery'

export const Config = Schema.object({
  workspacePath: Schema.string()
    .required()
    .pattern(/\S/),
  cron: Schema.string()
    .default('0 0 7 * * ? *'),
  message: Schema.string()
    .default('新的一天')
    .pattern(/\S/),
})

export type ConfigValue = ReturnType<typeof Config>
