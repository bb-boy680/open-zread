/**
 * Config Command - 调用 App 启动配置编辑器
 */

import { App } from '../App';

export async function runConfig() {
  App({ initialEntries: ['/config'] });
}