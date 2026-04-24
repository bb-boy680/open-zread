/**
 * VirtualSelect - 虚拟列表选择组件
 *
 * 只渲染可见区域的项目（viewportSize 个），避免渲染大量项目导致性能问题
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, memo, type ReactNode } from "react";

interface SelectItem {
  label: string;
  value: string;
}

interface VirtualSelectProps {
  items: SelectItem[];
  onSelect?: (item: SelectItem) => void;
  /** 可见区域大小（默认 10） */
  viewportSize?: number;
  /** 自定义渲染项目 */
  renderItem?: (item: SelectItem, isSelected: boolean) => ReactNode;
  /** 自定义渲染指示器 */
  renderIndicator?: (isSelected: boolean) => ReactNode;
}

const VirtualSelect = memo(function VirtualSelect({
  items,
  onSelect,
  viewportSize = 10,
  renderItem,
  renderIndicator,
}: VirtualSelectProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 计算可见范围
  const viewportStart = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(viewportSize / 2),
      items.length - viewportSize,
    ),
  );
  const viewportEnd = Math.min(items.length, viewportStart + viewportSize);
  const visibleItems = items.slice(viewportStart, viewportEnd);

  // 键盘导航
  useInput(
    useCallback(
      (input, key) => {
        if (key.upArrow) {
          setSelectedIndex((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow) {
          setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
        } else if (key.return && onSelect) {
          onSelect(items[selectedIndex]);
        }
      },
      [items, selectedIndex, onSelect],
    ),
  );

  // 默认渲染函数
  const defaultRenderItem = useCallback(
    (item: SelectItem, isSelected: boolean) => (
      <Text bold={isSelected} color={isSelected ? "cyan" : "white"}>
        {item.label}
      </Text>
    ),
    [],
  );

  const defaultRenderIndicator = useCallback(
    (isSelected: boolean) => (
      <Text color={isSelected ? "cyan" : "gray"}>{isSelected ? ">" : " "}</Text>
    ),
    [],
  );

  const itemRenderer = renderItem || defaultRenderItem;
  const indicatorRenderer = renderIndicator || defaultRenderIndicator;

  return (
    <Box flexDirection="column">
      {visibleItems.map((item, idx) => {
        const actualIndex = viewportStart + idx;
        const isSelected = actualIndex === selectedIndex;
        return (
          <Box key={item.value}>
            {indicatorRenderer(isSelected)}
            {itemRenderer(item, isSelected)}
          </Box>
        );
      })}
      {items.length > viewportSize && (
        <Text dimColor>
          ({selectedIndex + 1}/{items.length})
        </Text>
      )}
    </Box>
  );
});

export default VirtualSelect;
