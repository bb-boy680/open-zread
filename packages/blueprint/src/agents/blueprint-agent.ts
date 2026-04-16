/**
 * Blueprint Agent Definition
 *
 * Single agent that generates wiki.json blueprint using three-layer Repo Map.
 * Layer 1: Directory Tree → Layer 2: Core Signatures → Layer 3: Module Details
 */

import type { AgentDefinition } from '@open-zread/agent';
import { BLUEPRINT_AGENT_PROMPT, BLUEPRINT_AGENT_NAME } from '../prompts/blueprint-prompt.js';

export const BlueprintAgentDefinition: AgentDefinition = {
  description: '生成 Wiki 蓝图。通过三层 Repo Map（目录树 → 核心签名 → 模块详情）递进分析项目，生成高质量的 wiki.json。',
  prompt: BLUEPRINT_AGENT_PROMPT,
  tools: [
    'get_directory_tree',    // Layer 1: 纯目录结构
    'get_core_signatures',   // Layer 2: 核心文件签名
    'get_module_details',    // Layer 3: 模块完整详情
    'generate_blueprint',    // 生成 wiki.json
    'validate_blueprint',    // 验证关联文件存在性
    'Read',                  // 读取配置文件补充信息
    'Glob',                  // 搜索特定文件（测试、CI 配置等）
  ],
  maxTurns: 30,  // 三层调用需要更多轮次
};

export { BLUEPRINT_AGENT_NAME };