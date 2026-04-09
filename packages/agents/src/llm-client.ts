import type { AppConfig } from '@open-zread/types';
import { logger } from '@open-zread/utils';

interface LLMRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Call LLM API
export async function callLLM(
  config: AppConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const request: LLMRequest = {
    model: config.llm.model,
    messages,
    max_tokens: 4000,
    temperature: 0.7,
  };

  logger.info(`Calling LLM: ${config.llm.model}`);

  try {
    const response = await fetch(config.llm.base_url + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm.api_key}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data: LLMResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';

    logger.success('LLM response received');
    return content;
  } catch (error) {
    logger.error(`LLM call failed: ${error}`);
    throw error;
  }
}

// Parse JSON response
export function parseJsonResponse(response: string): unknown {
  // Try to extract JSON block
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON parse failed');
  }
}