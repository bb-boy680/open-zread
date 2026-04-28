/**
 * Wiki Home Page - Wiki 首页
 *
 * 根据 wiki.json 和文档生成状态动态显示选项列表
 * 首次配置时显示"尚未配置 LLM 提供商"，仅提供配置和退出选项
 */

import { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { useNavigate } from 'react-router';
import SelectInput from 'ink-select-input';
import { useI18n } from '../../i18n';
import { useWiki, useConfig } from '../../provider';
import Divider from '../../components/Divider';
import { getWikiDir, joinPath } from '@open-zread/utils';
import type { WikiPage, WikiOutput } from '@open-zread/types';

// SelectInput Item 类型
type SelectItem = { label: string; value: string };

// 进度检查函数
async function checkProgress(pages: WikiPage[]): Promise<{ total: number; generated: number }> {
  const wikiDir = getWikiDir();

  const checks = pages.map(async (page) => {
    // wiki 目录按 section 分组，文件路径：wikiDir/section/file.md
    const filePath = joinPath(wikiDir, page.section, page.file);
    const file = Bun.file(filePath);
    const exists = await file.exists();
    return exists;
  });

  const results = await Promise.all(checks);
  const generated = results.filter(Boolean).length;

  return { total: pages.length, generated };
}

// 构建首次配置选项列表
function buildFirstTimeSelectItems(
  t: (key: string, params?: Record<string, string | number>) => string
): SelectItem[] {
  return [
    { label: t('wiki.firstTimeConfig'), value: 'config' },
    { label: t('wiki.exit'), value: 'exit' },
  ];
}

// 构建正常选项列表
function buildNormalSelectItems(
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

  // 3. 管理文档（wiki.json 存在 + 文档已完成）
  if (wikiCatalog && progress && progress.generated === progress.total) {
    items.push({ label: t('wiki.manage'), value: 'manage' });
  }

  // 4. 强制重新生成（wiki.json 存在）
  if (wikiCatalog) {
    items.push({ label: t('wiki.force'), value: 'force' });
  }

  // 5. 配置（常驻）
  items.push({ label: t('wiki.config'), value: 'config' });

  // 6. 退出（常驻）
  items.push({ label: t('wiki.exit'), value: 'exit' });

  return items;
}

export default function WikiHomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { exit } = useApp();
  const { wikiCatalog } = useWiki();
  const { isFirstTime } = useConfig();
  const [progress, setProgress] = useState<{ total: number; generated: number } | null>(null);

  // 计算进度
  useEffect(() => {
    if (wikiCatalog?.pages) {
      checkProgress(wikiCatalog.pages).then(setProgress);
    } else {
      setProgress(null);
    }
  }, [wikiCatalog]);

  // 构建选项列表（首次配置 vs 正常）
  const selectItems = isFirstTime
    ? buildFirstTimeSelectItems(t)
    : buildNormalSelectItems(wikiCatalog, progress, t);

  // 选择处理
  const handleSelect = (item: SelectItem) => {
    switch (item.value) {
      case 'generate':
        navigate('/wiki/generate?mode=generate');
        break;
      case 'continue':
        navigate('/wiki/generate?mode=continue');
        break;
      case 'manage':
        navigate('/wiki/generate?mode=manage');
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

  // 状态标题（用于 Divider）
  const statusTitle = isFirstTime
    ? t('wiki.dividerFirstTime')
    : wikiCatalog
      ? progress && progress.generated === progress.total
        ? t('wiki.dividerComplete', { total: progress.total })
        : progress
          ? t('wiki.dividerInProgress', { generated: progress.generated, total: progress.total })
          : t('wiki.dividerHasCatalog')
      : t('wiki.dividerNoCatalog');

  // 状态颜色（首次配置用黄色警告，进行中用黄色，其他默认灰色）
  const statusColor = isFirstTime
    ? 'yellow'
    : wikiCatalog && progress && progress.generated < progress.total
      ? 'yellow'
      : undefined;

  return (
    <Box flexDirection="column">
      {/* ========== 状态分割线 ========== */}
      <Divider title={statusTitle} color={statusColor} />

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