import { Command } from 'commander';
import { runWiki } from './wiki';
import { runGenerate } from './commands/generate';
import { runConfig } from './commands/config';

const program = new Command();

program
  .name('open-zread')
  .description('将本地代码库转化为可读文档')
  .version('0.2.3');

// 默认命令
program
  .command('start', { isDefault: true })
  .description('启动 Wiki 文档生成')
  .option('--force', '强制重新开始')
  .action(async (opts) => {
    await runWiki({ force: opts.force });
  });

// generate 命令
program
  .command('generate')
  .description('仅生成 Wiki 蓝图')
  .option('--force', '强制重新解析')
  .action(async (opts) => {
    await runGenerate({ force: opts.force });
  });

// config 命令
program
  .command('config')
  .description('交互式配置编辑器')
  .action(async () => {
    await runConfig();
  });

program.parse();