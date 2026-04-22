/**
 * Config Provider Page - LLM 提供商选择
 */

import { Box, Text } from "ink";
import { useI18n } from "../../i18n";

export default function ConfigProviderPage() {
  const { t } = useI18n();

  return (
    <Box flexDirection="column">
      <Text bold>{t('provider.select')}</Text>
      <Text dimColor>{t('common.escBack')}</Text>
    </Box>
  );
}