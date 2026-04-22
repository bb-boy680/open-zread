import { Command } from 'commander';
import { runConfig } from './commands/config';
import { runWiki } from './commands/wiki';

const program = new Command();

// 默认命令：Wiki 文档生成（直接运行 open-zread 即可）
program
  .command('wiki', { isDefault: true })
  .description('Wiki 文档生成')
  .action(async () => {
    await runWiki();
  });

// config 命令
program
  .command('config')
  .description('交互式配置编辑器')
  .action(async () => {
    await runConfig();
  });

program.parse();