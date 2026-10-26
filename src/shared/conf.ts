import type Conf from 'conf'
import ConfCtor from 'conf'

// 三个 store 都只是工作区里的一个 JSON 文件 位置和默认值交给调用方
// 泛型跟着 conf 自己的约束走 它的 DefaultsOf<T> 对 unknown 值推不出来
export function openStore<T extends Record<string, any>>(
  workspacePath: string,
  configName: string,
  defaults: T,
): Conf<T> {
  return new ConfCtor<T>({ cwd: workspacePath, configName, defaults })
}
