/**
 * Config Concurrency Page - 最大并发数设置
 */

import { Box, Text } from "ink";
import { useI18n } from "../../i18n";

export default function ConfigConcurrencyPage() {
  const { t } = useI18n();

  return (
    <Box flexDirection="column">
      <Text bold>{t('concurrency.set')}</Text>
      <Text dimColor>{t('common.escBack')}</Text>
    </Box>
  );
}