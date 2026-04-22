/**
 * Config Doc Language Page - 文档生成语言选择
 */

import { Box, Text } from "ink";
import { useI18n } from "../../i18n";

export default function ConfigDocLanguagePage() {
  const { t } = useI18n();

  return (
    <Box flexDirection="column">
      <Text bold>{t('docLanguage.select')}</Text>
      <Text dimColor>{t('common.escBack')}</Text>
    </Box>
  );
}