---
"@open-zread/cli": minor
---

## v1.2.0

### Added

- Added a Chatbot to the browser preview for asking questions based on the current Wiki content. ([#40](https://github.com/bb-boy680/open-zread/pull/40))
- Added text-selection context support, enabling follow-up questions around selected Wiki snippets.
- Added CLI browser chat services and chat history APIs to power the preview Chatbot.

### Improved

- Reduced terminal status flicker during Wiki generation.
- Reset scroll position when switching Wiki pages to avoid carrying over the previous page's reading position.
