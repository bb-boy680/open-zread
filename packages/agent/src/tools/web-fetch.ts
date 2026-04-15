/**
 * WebFetchTool - Fetch web content
 */

import { defineTool } from './types.js'

export const WebFetchTool = defineTool({
  name: 'WebFetch',
  description: 'Fetch content from a URL and return it as text. Supports HTML pages, JSON APIs, and plain text. Strips HTML tags for readability.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch content from',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers',
      },
    },
    required: ['url'],
  },
  isReadOnly: true,
  isConcurrencySafe: true,
  async call(input, _context) {
    const { url, headers } = input

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentSDK/1.0)',
          ...headers,
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        return { data: `HTTP ${response.status}: ${response.statusText}`, is_error: true }
      }

      const contentType = response.headers.get('content-type') || ''
      let text = await response.text()

      // Strip HTML tags for readability
      if (contentType.includes('text/html')) {
        // Remove script and style blocks
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, ' ')
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim()
      }

      // Truncate very large responses
      if (text.length > 100000) {
        text = text.slice(0, 100000) + '\n...(truncated)'
      }

      return text || '(empty response)'
    } catch (err: any) {
      return { data: `Error fetching ${url}: ${err.message}`, is_error: true }
    }
  },
})
