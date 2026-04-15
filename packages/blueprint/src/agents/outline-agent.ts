/**
 * Outline Agent Definition
 *
 * Designs Wiki structure based on tech stack and core modules.
 */

import type { AgentDefinition } from '@open-zread/agent'
import { OUTLINE_AGENT_PROMPT, OUTLINE_AGENT_NAME } from '../prompts/outline-prompt.js'

export const OutlineAgentDefinition: AgentDefinition = {
  description: '生成 Wiki 大纲。基于核心模块和技术栈，推理符合人类思维的 Wiki 章节结构。',
  prompt: OUTLINE_AGENT_PROMPT,
  tools: [
    'generate_blueprint',
    'validate_blueprint',
    'Read',
    'Glob'
  ],
  maxTurns: 10
}

export { OUTLINE_AGENT_NAME }