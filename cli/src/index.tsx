import { Command } from "commander";
import { loadConfigSync } from "@open-zread/utils";
import { getVersion } from "./utils";
import { runConfig } from "./commands/config";
import { runWiki } from "./commands/wiki";
import { zhCN } from "./i18n/translations/zh-CN";
import { enUS } from "./i18n/translations/en-US";

// 获取语言配置（用于 CLI 启动时的帮助信息）
const config = loadConfigSync();
const lang = config?.language === "en" ? "en" : "zh";
const t = lang === "en" ? enUS : zhCN;

const program = new Command();

program
  .name("open-zread")
  .version(getVersion(), "-v, --version", t.cli.version)
  .helpOption("-h, --help", t.cli.help);

// 默认命令：Wiki 文档生成（直接运行 open-zread 即可）
program
  .command("wiki", { isDefault: true })
  .description(t.cli.wikiDesc)
  .action(async () => {
    await runWiki();
  });

// config 命令
program
  .command("config")
  .description(t.cli.configDesc)
  .action(async () => {
    await runConfig();
  });

program.parse();
