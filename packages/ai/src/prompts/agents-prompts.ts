export interface AgentPrompt {
  system: string;
  user: string;
}

export function fillPrompt(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

export const scanPrompt: AgentPrompt = {
  system: `You are a Principal Software Architect. Your task is to identify the project's identity, tech stack, and architecture.
Focus on root configuration files (e.g., package.json, go.mod, pyproject.toml, Cargo.toml) to determine the tech stack and language versions.
Output MUST be a raw JSON string — no markdown code blocks, no explanations.`,

  user: `Analyze this project metadata:
Total Files: {totalFiles}
Language Stats: {languageStats}
Root/Core Config Files Content: {coreConfigs}
File Tree (partial):
{fileList}

Determine:
1. Primary languages and their versions.
2. Frameworks (Frontend/Backend/Internal).
3. Build & Dev Tools.
4. Project Architecture Pattern (e.g., Monorepo, Microservices, MVC, DDD).
5. Main Entry Points.

Output JSON format:
{
  "techStack": {
    "languages": ["..."],
    "frameworks": ["..."],
    "buildTools": ["..."]
  },
  "projectType": "...",
  "entryPoints": ["..."]
}`,
};

export const clusterPrompt: AgentPrompt = {
  system: `You are an expert in System Design. Group files into logical "Core Modules" based on business logic, not just folder names.
Use the 'Reference Map' to identify "Hub Files" — files with high reference counts are system connectors.
Output MUST be a raw JSON string — no markdown code blocks, no explanations.`,

  user: `Identify logical modules by analyzing the tech stack and code skeletons:

Tech Stack: {techStack}
Highly-Referenced Hub Files (Path: Reference Count):
{referenceMap}

Skeleton Snippets (Key Files):
{skeleton}

Rules:
1. Don't just list folders. Group files by business logic (e.g., "Auth System", "Data Pipeline").
2. Distinguish "Infrastructure" modules from "Business Logic" modules.
3. Provide a 'reason' based on reference counts and code signatures.
4. Only include files that are clearly part of the module.

Output JSON format:
{
  "coreModules": [
    { "name": "...", "files": ["..."], "reason": "..." }
  ],
  "moduleGroups": {
    "Getting Started": ["..."],
    "Core Features": ["..."],
    "Advanced Features": ["..."]
  }
}`,
};

export const outlinePrompt: AgentPrompt = {
  system: `You are a Technical Writer. Design a professional Wiki structure for onboarding new developers.
Preferred Language: {language} — generate 'title' and 'section' in this language.
Output MUST be a raw JSON string — no markdown code blocks, no explanations.`,

  user: `Design the Wiki blueprint based on:
Tech Stack: {techStack}
Core Modules: {coreModules}

Recommended Wiki Structure:
1. Project Overview (Vision & Purpose)
2. Getting Started (Environment & Commands)
3. Architecture Design (Global flow & Patterns)
4. Core Modules (Deep dive into grouped modules)
5. Development Convention (Team rules, formatting)
6. Deployment & Ops

Reference Paths (these are the ONLY valid file paths):
{validPaths}

Constraints:
1. Every 'associatedFiles' path MUST exist in the Reference Paths list above. Do NOT hallucinate paths.
2. 'slug' must be unique kebab-case identifiers (e.g., "1-project-overview").
3. 'title' and 'section' must be in the specified language: {language}.

Output JSON format:
{
  "pages": [
    {
      "slug": "unique-kebab-case-id",
      "title": "Readable Title",
      "file": "unique-kebab-case-id.md",
      "section": "Category Name",
      "level": "Beginner",
      "associatedFiles": ["..."]
    }
  ]
}`,
};
