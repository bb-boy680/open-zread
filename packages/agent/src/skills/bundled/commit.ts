/**
 * Bundled Skill: commit
 *
 * Create a git commit with a well-crafted message based on staged changes.
 */

import { registerSkill } from '../registry.js'
import type { SkillContentBlock } from '../types.js'

const COMMIT_PROMPT = `Create a git commit for the current changes. Follow these steps:

1. Run \`git status\` and \`git diff --cached\` to understand what's staged
2. If nothing is staged, run \`git diff\` to see unstaged changes and suggest what to stage
3. Analyze the changes and draft a concise commit message that:
   - Uses imperative mood ("Add feature" not "Added feature")
   - Summarizes the "why" not just the "what"
   - Keeps the first line under 72 characters
   - Adds a body with details if the change is complex
4. Create the commit

Do NOT push to remote unless explicitly asked.`

export function registerCommitSkill(): void {
  registerSkill({
    name: 'commit',
    description: 'Create a git commit with a well-crafted message based on staged changes.',
    aliases: ['ci'],
    allowedTools: ['Bash', 'Read', 'Glob', 'Grep'],
    userInvocable: true,
    async getPrompt(args): Promise<SkillContentBlock[]> {
      let prompt = COMMIT_PROMPT
      if (args.trim()) {
        prompt += `\n\nAdditional instructions: ${args}`
      }
      return [{ type: 'text', text: prompt }]
    },
  })
}
