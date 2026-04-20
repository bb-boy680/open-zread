import { Command } from 'commander';
import { runGenerate } from './commands/generate';
import { runWiki } from './commands/wiki';
import { runConfig } from './commands/config';

const program = new Command();

program
  .name('open-zread')
  .description('Generate wiki documentation from source code')
  .version('0.1.0');

// generate 命令（默认命令）
program
  .command('generate', { isDefault: true })
  .description('生成 Wiki 蓝图（Phase 1）')
  .option('--force', '强制重新解析，忽略缓存')
  .action(async (opts) => {
    await runGenerate({ force: opts.force });
  });

// wiki 命令
program
  .command('wiki')
  .description('生成 Markdown 文档（Phase 2）')
  .option('--force', '强制重新生成所有页面')
  .action(async (opts) => {
    await runWiki({ force: opts.force });
  });

// config 命令
program
  .command('config')
  .description('交互式配置编辑器')
  .action(async () => {
    await runConfig();
  });

// 解析命令行参数
program.parse();