/**
 * Config Language Page - 界面语言选择
 */

import { Box, Text } from "ink";
import { useI18n } from "../../i18n";

export default function ConfigLanguagePage() {
  const { t } = useI18n();

  return (
    <Box flexDirection="column">
      <Text bold>{t('language.select')}</Text>
      <Text dimColor>{t('common.escBack')}</Text>
    </Box>
  );
}