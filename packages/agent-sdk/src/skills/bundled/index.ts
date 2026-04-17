/**
 * Bundled Skills Initialization
 *
 * Registers all built-in skills at SDK startup.
 */

import { registerSimplifySkill } from './simplify.js'
import { registerCommitSkill } from './commit.js'
import { registerReviewSkill } from './review.js'
import { registerDebugSkill } from './debug.js'
import { registerTestSkill } from './test.js'

let initialized = false

/**
 * Initialize all bundled skills.
 * Safe to call multiple times (idempotent).
 */
export function initBundledSkills(): void {
  if (initialized) return
  initialized = true

  registerSimplifySkill()
  registerCommitSkill()
  registerReviewSkill()
  registerDebugSkill()
  registerTestSkill()
}
