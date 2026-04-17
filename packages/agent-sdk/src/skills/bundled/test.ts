/**
 * Bundled Skill: test
 *
 * Run tests and analyze failures.
 */

import { registerSkill } from '../registry.js'
import type { SkillContentBlock } from '../types.js'

const TEST_PROMPT = `Run the project's test suite and analyze the results:

1. **Discover**: Find the test runner configuration
   - Look for package.json scripts, jest.config, vitest.config, pytest.ini, etc.
   - Identify the appropriate test command

2. **Execute**: Run the tests
   - Run the full test suite or specific tests if specified
   - Capture output including failures and errors

3. **Analyze**: If tests fail:
   - Read the failing test to understand what it expects
   - Read the source code being tested
   - Identify why the test is failing
   - Fix the issue (in tests or source as appropriate)

4. **Re-verify**: Run the failing tests again to confirm the fix`

export function registerTestSkill(): void {
  registerSkill({
    name: 'test',
    description: 'Run tests and analyze failures, fixing any issues found.',
    aliases: ['run-tests'],
    allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
    userInvocable: true,
    async getPrompt(args): Promise<SkillContentBlock[]> {
      let prompt = TEST_PROMPT
      if (args.trim()) {
        prompt += `\n\nSpecific test target: ${args}`
      }
      return [{ type: 'text', text: prompt }]
    },
  })
}
