---
"@open-zread/cli": patch
---

Fix provider configuration and mermaid preview zoom issues

**Bug Fixes:**

- **provider**: Support custom provider and auto-detect API format from base_url
  - Add 'custom' provider mapping to openai-completions API type
  - Pass provider field from config to SDK as providerId
  - Fix base_url '/anthropic' detection priority in extractProviderId()
  - Fixes #25

- **browse**: Fix mermaid wheel zoom not following mouse position
  - Fix zoom centering on SVG center instead of mouse position
  - Remove viewport flex centering, set transform-origin to left top
  - Add mouse-following offset calculation in handleWheel
