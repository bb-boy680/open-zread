/**
 * Bundled Skill: simplify
 *
 * Reviews changed code for reuse opportunities, code quality issues,
 * and efficiency improvements, then fixes any issues found.
 */

import { registerSkill } from '../registry.js'
import type { SkillContentBlock } from '../types.js'

const SIMPLIFY_PROMPT = `Review the recently changed code for three categories of improvements. Launch 3 parallel Agent sub-tasks:

## Task 1: Reuse Analysis
Look for:
- Duplicated code that could be consolidated
- Existing utilities or helpers that could replace new code
- Patterns that should be extracted into shared functions
- Re-implementations of functionality that already exists elsewhere

## Task 2: Code Quality
Look for:
- Overly complex logic that could be simplified
- Poor naming or unclear intent
- Missing edge case handling
- Unnecessary abstractions or over-engineering
- Dead code or unused imports

## Task 3: Efficiency
Look for:
- Unnecessary allocations or copies
- N+1 query patterns or redundant I/O
- Blocking operations that could be async
- Inefficient data structures for the access pattern
- Unnecessary re-computation

After all three analyses complete, fix any issues found. Prioritize by impact.`

export function registerSimplifySkill(): void {
  registerSkill({
    name: 'simplify',
    description: 'Review changed code for reuse, quality, and efficiency, then fix any issues found.',
    userInvocable: true,
    async getPrompt(args): Promise<SkillContentBlock[]> {
      let prompt = SIMPLIFY_PROMPT
      if (args.trim()) {
        prompt += `\n\n## Additional Focus\n${args}`
      }
      return [{ type: 'text', text: prompt }]
    },
  })
}
