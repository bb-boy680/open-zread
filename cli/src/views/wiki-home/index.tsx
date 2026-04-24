/**
 * Wiki Home Page - Wiki 首页
 *
 * 根据 wiki.json 和文档生成状态动态显示选项列表
 */

import { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { useNavigate } from 'react-router';
import SelectInput from 'ink-select-input';
import { useI18n } from '../../i18n';
import { useWiki } from '../../provider';
import type { WikiPage, WikiOutput } from '@open-zread/types';

// SelectInput Item 类型
type SelectItem = { label: string; value: string };

// 进度检查函数
async function checkProgress(pages: WikiPage[]): Promise<{ total: number; generated: number }> {
  const outputDir = '.open-zread/output/wiki';

  const checks = pages.map(async (page) => {
    const filePath = `${outputDir}/${page.file}`;
    const file = Bun.file(filePath);
    const exists = await file.exists();
    return exists;
  });

  const results = await Promise.all(checks);
  const generated = results.filter(Boolean).length;

  return { total: pages.length, generated };
}

// 构建选项列表
function buildSelectItems(
  wikiCatalog: WikiOutput | null,
  progress: { total: number; generated: number } | null,
  t: (key: string, params?: Record<string, string | number>) => string
): SelectItem[] {
  const items: SelectItem[] = [];

  // 1. 生成文档（wiki.json 不存在）
  if (!wikiCatalog) {
    items.push({ label: t('wiki.generate'), value: 'generate' });
  }

  // 2. 继续生成（wiki.json 存在 + 文档未完成）
  if (wikiCatalog && progress && progress.generated < progress.total) {
    items.push({
      label: t('wiki.continue', { generated: progress.generated, total: progress.total }),
      value: 'continue',
    });
  }

  // 3. 强制重新生成（wiki.json 存在）
  if (wikiCatalog) {
    items.push({ label: t('wiki.force'), value: 'force' });
  }

  // 4. 配置（常驻）
  items.push({ label: t('wiki.config'), value: 'config' });

  // 5. 退出（常驻）
  items.push({ label: t('wiki.exit'), value: 'exit' });

  return items;
}

export default function WikiHomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { exit } = useApp();
  const { wikiCatalog } = useWiki();
  const [progress, setProgress] = useState<{ total: number; generated: number } | null>(null);

  // 计算进度
  useEffect(() => {
    if (wikiCatalog?.pages) {
      checkProgress(wikiCatalog.pages).then(setProgress);
    } else {
      setProgress(null);
    }
  }, [wikiCatalog]);

  // 构建选项列表
  const selectItems = buildSelectItems(wikiCatalog, progress, t);

  // 选择处理
  const handleSelect = (item: SelectItem) => {
    switch (item.value) {
      case 'generate':
        navigate('/wiki/generate?mode=generate');
        break;
      case 'continue':
        navigate('/wiki/generate?mode=continue');
        break;
      case 'force':
        navigate('/wiki/generate?mode=force');
        break;
      case 'config':
        navigate('/config');
        break;
      case 'exit':
        exit();  // 正确退出应用
        break;
    }
  };

  // 状态文字
  const statusText = wikiCatalog
    ? progress && progress.generated === progress.total
      ? t('wiki.statusComplete', { total: progress.total })
      : progress
        ? t('wiki.statusInProgress', { generated: progress.generated, total: progress.total })
        : t('wiki.statusHasCatalog')
    : t('wiki.statusNoCatalog');

  return (
    <Box flexDirection="column">
      {/* ========== 状态信息 ========== */}
      <Box marginTop={1}>
        <Text color="yellow">{statusText}</Text>
      </Box>

      {/* ========== 选项列表 ========== */}
      <Box marginTop={1}>
        <SelectInput
          items={selectItems}
          onSelect={handleSelect}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? 'cyan' : 'gray'}>
              {isSelected ? '│ ' : '  '}
            </Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text bold={isSelected} color={isSelected ? 'white' : 'gray'}>
              {label}
            </Text>
          )}
        />
      </Box>

      {/* ========== Footer ========== */}
      <Box marginTop={1}>
        <Text dimColor>{t('wiki.footer')}</Text>
      </Box>
    </Box>
  );
}