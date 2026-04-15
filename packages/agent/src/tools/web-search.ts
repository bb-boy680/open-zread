/**
 * WebSearchTool - Web search (via web fetch of search engines)
 */

import { defineTool } from './types.js'

export const WebSearchTool = defineTool({
  name: 'WebSearch',
  description: 'Search the web for information. Returns search results with titles, URLs, and snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      num_results: {
        type: 'number',
        description: 'Number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },
  isReadOnly: true,
  isConcurrencySafe: true,
  async call(input, _context) {
    const { query } = input

    try {
      // Use DuckDuckGo HTML search as a free fallback
      const encoded = encodeURIComponent(query)
      const url = `https://html.duckduckgo.com/html/?q=${encoded}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentSDK/1.0)',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        return { data: `Search failed: HTTP ${response.status}`, is_error: true }
      }

      const html = await response.text()

      // Parse search results from DuckDuckGo HTML
      const results: string[] = []
      const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
      const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

      let match
      const links: Array<{ title: string; url: string }> = []

      while ((match = resultRegex.exec(html)) !== null) {
        const href = match[1]
        const title = match[2].replace(/<[^>]+>/g, '').trim()
        if (href && title && !href.includes('duckduckgo.com')) {
          links.push({ title, url: href })
        }
      }

      const snippets: string[] = []
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]+>/g, '').trim())
      }

      const numResults = Math.min(input.num_results || 5, links.length)
      for (let i = 0; i < numResults; i++) {
        const link = links[i]
        if (!link) continue
        let entry = `${i + 1}. ${link.title}\n   ${link.url}`
        if (snippets[i]) {
          entry += `\n   ${snippets[i]}`
        }
        results.push(entry)
      }

      return results.length > 0
        ? results.join('\n\n')
        : `No results found for "${query}"`
    } catch (err: any) {
      return { data: `Search error: ${err.message}`, is_error: true }
    }
  },
})
