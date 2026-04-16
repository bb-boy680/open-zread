/**
 * Blueprint Agent Definition
 *
 * Single agent that generates wiki.json blueprint from Repo Map.
 * Replaces the previous 3-agent architecture (ScanAgent, ClusterAgent, OutlineAgent).
 */

import type { AgentDefinition } from '@open-zread/agent';
import { BLUEPRINT_AGENT_PROMPT, BLUEPRINT_AGENT_NAME } from '../prompts/blueprint-prompt.js';

export const BlueprintAgentDefinition: AgentDefinition = {
  description: '生成 Wiki 蓝图。基于 Repo Map（树状项目上下文），一次完成技术栈识别、核心模块分析和章节设计。',
  prompt: BLUEPRINT_AGENT_PROMPT,
  tools: [
    'get_repo_map',          // 核心输入：Repo Map（含技术栈、目录树、引用计数）
    'generate_blueprint',    // 生成 wiki.json
    'validate_blueprint',    // 验证关联文件存在性
    'Read',                  // 读取配置文件补充信息
    'Glob',                  // 搜索特定文件（测试、CI 配置等）
  ],
  maxTurns: 15,  // 单一 Agent 需要更多轮次完成所有工作
};

export { BLUEPRINT_AGENT_NAME };