---
title: 流程图滚轮缩放不跟随鼠标位置
description: handleWheel缺少offset补偿计算，且viewport flex居中干扰offset控制
time: 2025-05-19 01:45
---

**调用堆栈**：
```
用户滚轮 → onWheel事件 → handleWheel(event)
    → 计算 nextScale = clampScale(scale - deltaY * 0.0015)
    → setScale(nextScale) [缺少offset计算]
    → React re-render
    → diagram-div width = svgSize.width * scale
    → viewport flex居中重新计算位置 [与offset冲突]
    → 缩放以viewport中心为基准，而非鼠标位置
```

**样式链**：
```
.mermaid-preview-viewport {
  display: flex;           [问题源头：flex居中]
  align-items: center;
  justify-content: center;
}
.mermaid-preview-diagram {
  padding: 32px;           [需要纳入offset计算]
}
.mermaid-preview-transform {
  transform-origin: center center;  [改为left top]
}
```

**BUG 症状**：
- **用户描述的问题**：流程图放大查看时，滚动缩放没有正确跟随鼠标位置，画面以中心为基准缩放
- **正确现象**：缩放应该以鼠标位置为中心进行，鼠标下的内容点保持不变

**错误源头**：`MermaidPreviewModal.tsx:handleWheel` 缺少鼠标位置相关的offset计算，且CSS中viewport的flex居中干扰了手动offset控制

**正确性假设**：
1. scale值正确变化（用户确认百分比数值正确）
2. 缩放中心点计算缺失（画面以中心为基准而非鼠标位置）
3. CSS flex居中会重新计算内容位置，与offset冲突

**修复方式**：
```diff
--- a/apps/browse/src/pages/wiki-page/components/MermaidPreviewModal.tsx
+++ b/apps/browse/src/pages/wiki-page/components/MermaidPreviewModal.tsx
@@ @24,6 +24,7 @@
 const MIN_SCALE = 0.25;
 const MAX_SCALE = 3;
 const DEFAULT_SIZE: Size = { width: 1200, height: 800 };
+const DIAGRAM_PADDING = 32;

@@ @94,16 +99,17 @@
 const fit = () => {
   ...
-  setOffset({ x: 0, y: 0 });
+  const totalWidth = svgSize.width * newScale + DIAGRAM_PADDING * 2;
+  const totalHeight = svgSize.height * newScale + DIAGRAM_PADDING * 2;
+  const centerOffsetX = (viewport.clientWidth - totalWidth) / 2;
+  const centerOffsetY = (viewport.clientHeight - totalHeight) / 2;
+  setOffset({ x: centerOffsetX, y: centerOffsetY });
 };

@@ @112,3 +118,3 @@
-const transform = useMemo(() => `translate(${offset.x}px, ${offset.y}px)`, [offset.x, offset.y]);
+const transform = useMemo(() => `translate(${offset.x}px, ${offset.y}px)`, [offset.x, offset.y]);

@@ @117,12 +124,14 @@
 const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
   ...
-  const nextScale = clampScale(scale - event.deltaY * 0.0015);
-  setScale(nextScale);
+  const contentX = (mouseX - offset.x - DIAGRAM_PADDING) / scale;
+  const contentY = (mouseY - offset.y - DIAGRAM_PADDING) / scale;
+  const nextScale = clampScale(scale - event.deltaY * 0.0015);
+  const nextOffset = {
+    x: mouseX - DIAGRAM_PADDING - contentX * nextScale,
+    y: mouseY - DIAGRAM_PADDING - contentY * nextScale
+  };
+  setScale(nextScale);
+  setOffset(nextOffset);
 };
```

```diff
--- a/apps/browse/src/index.css
+++ b/apps/browse/src/index.css
@@ @320,5 +320,2 @@
 .mermaid-preview-viewport {
-  display: flex;
-  align-items: center;
-  justify-content: center;
 }

@@ @343,2 +340,2 @@
 .mermaid-preview-transform {
-  transform-origin: center center;
+  transform-origin: left top;
 }
```

**关键教训**：
1. 实现鼠标跟随缩放时，必须计算鼠标相对于内容的位置(viewBox坐标)，并调整offset使该位置保持不变
2. CSS flex居中会动态重新计算子元素位置，与手动offset控制产生冲突，应移除flex居中让offset完全控制位置
3. diagram-div的padding需要纳入offset计算，SVG左上角屏幕位置 = offset.x + padding
4. 使用width方式实现SVG缩放（而非CSS scale），可以保持矢量图形的清晰度

**修复结果**：滚轮缩放现在正确跟随鼠标位置，流程图放大后保持清晰