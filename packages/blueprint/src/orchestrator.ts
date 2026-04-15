/**
 * Blueprint Orchestrator
 *
 * Coordinates ScanAgent → ClusterAgent → OutlineAgent to generate wiki.json blueprint.
 */

import { createAgent, getAllBaseTools, type SDKMessage, type AgentDefinition } from '@open-zread/agent'
import { logger, getProjectRoot, loadConfig } from '@open-zread/core'
import { getAllBlueprintTools } from './tools/index.js'
import {
  ScanAgentDefinition, SCAN_AGENT_NAME,
  ClusterAgentDefinition, CLUSTER_AGENT_NAME,
  OutlineAgentDefinition, OUTLINE_AGENT_NAME
} from './agents/index.js'
import type { BlueprintOptions, BlueprintResult, TechStackSummary, CoreModules } from './types.js'

/**
 * Generate Wiki Blueprint
 *
 * Orchestrates three agents to scan, cluster, and outline the project.
 * All LLM config is loaded from ~/.zread/config.yaml - no fallbacks.
 *
 * @param options - Blueprint generation options (projectRoot, language, debug only)
 * @returns BlueprintResult with output path and metadata
 */
export async function generateBlueprint(options?: BlueprintOptions): Promise<BlueprintResult> {
  const startTime = performance.now()
  const projectRoot = options?.projectRoot || getProjectRoot()
  const language = options?.language || 'zh'
  const debug = options?.debug || false

  // Load config from ~/.zread/config.yaml - REQUIRED
  const config = await loadConfig()

  // Extract LLM config
  const model = config.llm.model
  const apiKey = config.llm.api_key
  const baseURL = config.llm.base_url
  const apiType = config.llm.provider === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
  const maxTurns = 30

  logger.info(`开始生成 Wiki 蓝图: ${projectRoot}`)
  logger.info(`模型: ${model}, API: ${apiType}, Base URL: ${baseURL}`)

  // Assemble all tools
  const blueprintTools = getAllBlueprintTools()
  const baseTools = getAllBaseTools()
  const allTools = [...baseTools, ...blueprintTools]

  // Register sub-agent definitions
  const agents: Record<string, AgentDefinition> = {
    [SCAN_AGENT_NAME]: ScanAgentDefinition,
    [CLUSTER_AGENT_NAME]: ClusterAgentDefinition,
    [OUTLINE_AGENT_NAME]: OutlineAgentDefinition
  }

  // Create main orchestrator agent with LLM config from ~/.zread/config.yaml
  const agent = createAgent({
    model,
    apiType,
    apiKey,
    baseURL,
    cwd: projectRoot,
    tools: allTools,
    maxTurns,
    agents,
    permissionMode: 'bypassPermissions'
  })

  // Main orchestration prompt
  const mainPrompt = buildOrchestrationPrompt(language)

  let outputPath = ''
  let techStackSummary: TechStackSummary | undefined
  let coreModules: CoreModules | undefined

  // Execute main agent
  try {
    for await (const event of agent.query(mainPrompt)) {
      const msg = event as SDKMessage

      // Log progress - no truncation
      if (msg.type === 'assistant') {
        for (const block of (msg as any).message?.content || []) {
          if (block.type === 'tool_use') {
            const toolName = block.name
            const toolInput = JSON.stringify(block.input || {})
            logger.progress(`[${toolName}]`, toolInput)

            // Capture results for context
            if (toolName === 'detect_tech_stack') {
              // Will be captured in tool_result
            }
          }
          // Always print AI text output to terminal (streaming)
          if (block.type === 'text' && block.text) {
            // Print full text, not truncated
            logger.info(block.text)
          }
        }
      }

      if (msg.type === 'tool_result') {
        const result = (msg as any).result
        // Always log tool result, no truncation
        logger.info(`[Tool Result: ${result.tool_name}] ${result.output}`)

        // Try to parse structured output
        try {
          const output = JSON.parse(result.output)
          if (result.tool_name === 'detect_tech_stack') {
            techStackSummary = output as TechStackSummary
          }
          if (result.tool_name === 'analyze_references') {
            coreModules = { coreModules: output.coreModules || [], moduleGroups: {} }
          }
        } catch {
          // Not JSON output, skip
        }
      }

      if (msg.type === 'result') {
        const result = msg as any
        if (result.subtype === 'success') {
          logger.success('蓝图生成完成')
          // Try to extract output path from result
          if (result.result?.includes('Blueprint generated')) {
            outputPath = result.result.match(/Blueprint generated: (.+)/)?.[1] || ''
          }
        } else {
          logger.error(`蓝图生成失败: ${result.subtype}`)
          if (result.errors) {
            for (const err of result.errors) {
              logger.error(err)
            }
          }
        }
      }
    }
  } catch (err: any) {
    logger.error(`Agent 执行错误: ${err.message}`)
    throw err
  }

  const durationMs = Math.round(performance.now() - startTime)

  return {
    outputPath,
    pagesCount: 0, // Will be determined by reading wiki.json
    techStackSummary,
    coreModules,
    durationMs
  }
}

/**
 * Build orchestration prompt
 */
function buildOrchestrationPrompt(language: 'zh' | 'en'): string {
  const langNote = language === 'zh'
    ? 'Wiki 标题使用中文，slug 使用英文'
    : 'Wiki titles and slugs use English'

  return `
请使用子代理依次完成 Wiki 蓝图生成任务：

## 执行步骤

### Step 1: 扫描项目
使用 Agent 工具调用 "${SCAN_AGENT_NAME}" 子代理：
- 任务：扫描项目目录，识别技术栈
- 输出：TechStackSummary JSON

示例调用：
\`\`\`
Agent({
  subagent_type: "${SCAN_AGENT_NAME}",
  description: "扫描项目结构",
  prompt: "扫描项目目录，识别技术栈和项目类型"
})
\`\`\`

### Step 2: 聚类分析
使用 Agent 工具调用 "${CLUSTER_AGENT_NAME}" 子代理：
- 任务：分析代码结构，识别核心模块
- 输入：传递 Step 1 的 TechStackSummary 结果
- 输出：CoreModules JSON

示例调用：
\`\`\`
Agent({
  subagent_type: "${CLUSTER_AGENT_NAME}",
  description: "聚类分析核心模块",
  prompt: "分析代码引用关系，识别核心模块。技术栈信息：[传递 Step 1 结果]"
})
\`\`\`

### Step 3: 生成大纲
使用 Agent 工具调用 "${OUTLINE_AGENT_NAME}" 子代理：
- 任务：设计 Wiki 章节结构
- 输入：传递 Step 1 和 Step 2 的结果
- 输出：调用 generate_blueprint 保存 wiki.json

示例调用：
\`\`\`
Agent({
  subagent_type: "${OUTLINE_AGENT_NAME}",
  description: "生成 Wiki 大纲",
  prompt: "设计 Wiki 结构并生成蓝图。技术栈：[Step 1 结果]，核心模块：[Step 2 结果]"
})
\`\`\`

## 重要说明
- ${langNote}
- 确保每个步骤完成后传递结果给下一个步骤
- 最终调用 generate_blueprint 工具保存 wiki.json
- 使用 validate_blueprint 验证关联文件是否存在
`
}

// Re-export types
export type { BlueprintOptions, BlueprintResult } from './types.js'