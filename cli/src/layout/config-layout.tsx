/**
 * ConfigLayout - Config 模块统一布局
 *
 * 包含统一的 header，子页面只需渲染内容
 */

import { Box } from 'ink';
import { Outlet, useLocation, useParams } from 'react-router';
import Divider from '../components/Divider';
import { useI18n } from '../i18n';

// 路径到标题键的映射
const routeTitleMap: Record<string, string> = {
  '/config/language': 'language.select',
  '/config/doc_language': 'docLanguage.select',
  '/config/provider': 'provider.select',
  '/config/concurrency': 'concurrency.set',
  '/config/retry': 'retry.set',
};

export default function ConfigLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const params = useParams();

  // 获取标题
  let displayTitle = t('config.title');

  // 基础路径匹配
  const titleKey = routeTitleMap[location.pathname];
  if (titleKey) {
    displayTitle = t(titleKey);
  }

  // 动态路由处理
  if (location.pathname.includes('/config/provider/')) {
    // 自定义 Provider
    if (location.pathname.includes('/custom')) {
      displayTitle = t('customProvider.title');
    }
    // Model 选择
    else if (params.providerId && !location.pathname.includes('/model/')) {
      displayTitle = `${params.providerId}`;
    }
    // API Key 输入
    else if (params.modelId) {
      displayTitle = `${params.providerId}/${params.modelId}`;
    }
  }

  return (
    <Box flexDirection="column">
      {/* 统一 Header */}
      <Divider title={`${t('config.title')} · ${displayTitle}`} />

      {/* 子页面内容 */}
      <Outlet />
    </Box>
  );
}