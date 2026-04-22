import { Command } from 'commander';
import { runConfig } from './commands/config';

const program = new Command();

// config 命令
program
  .command('config')
  .description('交互式配置编辑器')
  .action(async () => {
    await runConfig();
  });

program.parse();