/**
 * Cluster Agent Definition
 *
 * Analyzes code structure to identify core modules based on reference counts.
 */

import type { AgentDefinition } from '@open-zread/agent'
import { CLUSTER_AGENT_PROMPT, CLUSTER_AGENT_NAME } from '../prompts/cluster-prompt.js'

export const ClusterAgentDefinition: AgentDefinition = {
  description: '聚类分析核心模块。基于引用计数识别高频引用的文件，标记为核心模块。',
  prompt: CLUSTER_AGENT_PROMPT,
  tools: [
    'parse_symbols',
    'dehydrate_skeleton',
    'count_references',
    'analyze_references',
    'Read',
    'Grep'
  ],
  maxTurns: 8
}

export { CLUSTER_AGENT_NAME }