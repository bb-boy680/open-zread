/**
 * Scan Agent Definition
 *
 * Scans project structure and detects tech stack.
 */

import type { AgentDefinition } from '@open-zread/agent'
import { SCAN_AGENT_PROMPT, SCAN_AGENT_NAME } from '../prompts/scan-prompt.js'

export const ScanAgentDefinition: AgentDefinition = {
  description: '扫描项目结构，识别技术栈和项目类型。负责生成 TechStackSummary。',
  prompt: SCAN_AGENT_PROMPT,
  tools: [
    'scan_project',
    'detect_tech_stack',
    'get_directory_tree',
    'Read',
    'Glob'
  ],
  maxTurns: 5
}

export { SCAN_AGENT_NAME }