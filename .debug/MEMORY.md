# Debug Memory Index

- [流程图放大超过100%失效](mermaid-zoom-100-percent-fix.md) — CSS优先级导致max-width未正确覆盖，SVG被限制在原始尺寸
- [流程图滚轮缩放不跟随鼠标位置](mermaid-wheel-zoom-mouse-follow-fix.md) — handleWheel缺少offset补偿计算，且viewport flex居中干扰offset控制
- [custom provider 配置被忽略导致 404 错误](custom-provider-404-fix.md) — 配置中 provider 字段未传递给 SDK，且 base_url 中的 /anthropic 路径检测优先级低于 providerId