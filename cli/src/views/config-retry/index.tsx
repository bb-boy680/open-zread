/**
 * Config Retry Page - 最大重试次数设置
 */

import { Box, Text } from "ink";
import { useI18n } from "../../i18n";

export default function ConfigRetryPage() {
  const { t } = useI18n();

  return (
    <Box flexDirection="column">
      <Text bold>{t('retry.set')}</Text>
      <Text dimColor>{t('common.escBack')}</Text>
    </Box>
  );
}