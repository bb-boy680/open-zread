/**
 * Example 12: Skills
 *
 * Shows how to use the skill system: bundled skills, custom skills,
 * and invoking skills programmatically.
 *
 * Run: npx tsx examples/12-skills.ts
 */
import {
  createAgent,
  registerSkill,
  getAllSkills,
  getUserInvocableSkills,
  getSkill,
  initBundledSkills,
} from '../src/index.js'
import type { SkillContentBlock } from '../src/index.js'

async function main() {
  console.log('--- Example 12: Skills ---\n')

  // Bundled skills are auto-initialized when creating an Agent,
  // but you can also init them explicitly:
  initBundledSkills()

  // List all registered skills
  const all = getAllSkills()
  console.log(`Registered skills (${all.length}):`)
  for (const skill of all) {
    console.log(`  - ${skill.name}: ${skill.description.slice(0, 80)}...`)
  }

  // Register a custom skill
  registerSkill({
    name: 'explain',
    description: 'Explain a concept or piece of code in simple terms.',
    aliases: ['eli5'],
    userInvocable: true,
    async getPrompt(args): Promise<SkillContentBlock[]> {
      return [{
        type: 'text',
        text: `Explain the following in simple, clear terms that a beginner could understand. Use analogies where helpful.\n\nTopic: ${args || 'Ask the user what they want explained.'}`,
      }]
    },
  })

  console.log(`\nAfter registering custom skill: ${getAllSkills().length} total`)
  console.log(`User-invocable: ${getUserInvocableSkills().length}`)

  // Get a specific skill
  const commitSkill = getSkill('commit')
  if (commitSkill) {
    const blocks = await commitSkill.getPrompt('', { cwd: process.cwd() })
    console.log(`\nCommit skill prompt (first 200 chars):`)
    console.log(blocks[0]?.type === 'text' ? blocks[0].text.slice(0, 200) + '...' : '(non-text)')
  }

  // Use skills with an agent - the model can invoke them via the Skill tool
  console.log('\n--- Using skills with an agent ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 5,
  })

  for await (const event of agent.query(
    'Use the "explain" skill to explain what git rebase does.',
  )) {
    const msg = event as any
    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if (block.type === 'tool_use') {
          console.log(`[Tool: ${block.name}] ${JSON.stringify(block.input)}`)
        }
        if (block.type === 'text' && block.text.trim()) {
          console.log(block.text)
        }
      }
    }
    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} ---`)
    }
  }

  await agent.close()
}

main().catch(console.error)
