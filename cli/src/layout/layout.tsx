/**
 * Layout - 统一布局，处理 ESC 返回
 *
 * 大多数页面的 ESC 返回逻辑由 Layout 统一处理。
 * 特殊页面（如搜索模式）通过 EscContext 声明优先处理。
 * 项目信息框全局显示。
 */

import { Box, Text, useInput, useApp } from 'ink';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useEscHandler, useConfig } from '../provider';
import { useI18n } from '../i18n';

// 版本信息
const VERSION = '0.1.0';
const PROJECT_NAME = 'open-zread';
const GITHUB_URL = 'https://github.com/bb-boy680/open-zread';

// 获取简短路径
function getShortPath(path: string): string {
  const home = process.env.HOME || '';
  if (home && path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exit } = useApp();
  const { isChildHandling } = useEscHandler();
  const { config } = useConfig();
  const { t } = useI18n();

  // 项目信息
  const currentDir = getShortPath(process.cwd());
  const modelName = config.llm.model || '未设置';

  useInput((_input, key) => {
    if (key.escape && !isChildHandling) {
      // 有导航历史时，返回上一级
      if (location.key !== 'default') {
        navigate(-1);
      } else {
        // 无导航历史时，根页面退出，子页面跳转到父页面
        if (location.pathname === '/wiki' || location.pathname === '/config') {
          exit();
        } else if (location.pathname.startsWith('/config/')) {
          navigate('/config');
        } else if (location.pathname.startsWith('/wiki/')) {
          navigate('/wiki');
        } else {
          exit();
        }
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* ========== 项目信息框（全局显示） ========== */}
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        flexDirection="column"
      >
        {/* 标题行 */}
        <Box>
          <Text bold color="cyan">{PROJECT_NAME}</Text>
          <Text dimColor> {VERSION}</Text>
        </Box>

        {/* 空行 */}
        <Text> </Text>

        {/* 模型 */}
        <Box>
          <Text dimColor>{t('layout.model')}: </Text>
          <Text>{modelName}</Text>
        </Box>

        {/* 目录 */}
        <Box>
          <Text dimColor>{t('layout.directory')}: </Text>
          <Text>{currentDir}</Text>
        </Box>
      </Box>

      {/* ========== 介绍文字 ========== */}
      <Box marginTop={1} flexDirection="column">
        <Text>      {t('layout.intro')}</Text>
        <Text dimColor>      {t('layout.github', { url: GITHUB_URL })}</Text>
      </Box>

      {/* ========== 页面内容 ========== */}
      <Outlet />
    </Box>
  );
}