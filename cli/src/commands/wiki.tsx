/**
 * Wiki Command - 调用 App 启动 Wiki 文档生成
 */

import { App } from '../App';

export async function runWiki() {
  App({ initialEntries: ['/wiki'] });
}