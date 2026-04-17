/**
 * FileEditTool - Precise string replacement in files
 */

import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { defineTool, getRequiredString, getBoolean } from './types.js'

export const FileEditTool = defineTool({
  name: 'Edit',
  description: 'Perform exact string replacements in files. The old_string must match exactly (including whitespace and indentation). Use replace_all to change every occurrence.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to modify',
      },
      old_string: {
        type: 'string',
        description: 'The exact text to find and replace',
      },
      new_string: {
        type: 'string',
        description: 'The replacement text',
      },
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurrences (default false)',
      },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
  isReadOnly: false,
  isConcurrencySafe: false,
  async call(input, context) {
    const filePath = resolve(context.cwd, getRequiredString(input, 'file_path'))
    const old_string = getRequiredString(input, 'old_string')
    const new_string = getRequiredString(input, 'new_string')
    const replace_all = getBoolean(input, 'replace_all') ?? false

    if (old_string === new_string) {
      return { data: 'Error: old_string and new_string are identical', is_error: true }
    }

    try {
      let content = await readFile(filePath, 'utf-8')

      if (!content.includes(old_string)) {
        return { data: `Error: old_string not found in ${filePath}. Make sure it matches exactly including whitespace.`, is_error: true }
      }

      if (!replace_all) {
        // Check uniqueness
        const count = content.split(old_string).length - 1
        if (count > 1) {
          return {
            data: `Error: old_string appears ${count} times in the file. Provide more context to make it unique, or set replace_all: true.`,
            is_error: true,
          }
        }
        content = content.replace(old_string, new_string)
      } else {
        content = content.split(old_string).join(new_string)
      }

      await writeFile(filePath, content, 'utf-8')
      return `File edited: ${filePath}`
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return { data: `Error: File not found: ${filePath}`, is_error: true }
      }
      return { data: `Error editing file: ${error.message}`, is_error: true }
    }
  },
})
