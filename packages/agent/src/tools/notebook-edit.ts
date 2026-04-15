/**
 * NotebookEditTool - Edit Jupyter notebooks
 */

import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { defineTool } from './types.js'

export const NotebookEditTool = defineTool({
  name: 'NotebookEdit',
  description: 'Edit Jupyter notebook (.ipynb) cells. Can insert, replace, or delete cells.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the .ipynb file',
      },
      command: {
        type: 'string',
        enum: ['insert', 'replace', 'delete'],
        description: 'The edit operation to perform',
      },
      cell_number: {
        type: 'number',
        description: 'Cell index (0-based) to operate on',
      },
      cell_type: {
        type: 'string',
        enum: ['code', 'markdown'],
        description: 'Type of cell (for insert/replace)',
      },
      source: {
        type: 'string',
        description: 'Cell content (for insert/replace)',
      },
    },
    required: ['file_path', 'command', 'cell_number'],
  },
  isReadOnly: false,
  isConcurrencySafe: false,
  async call(input, context) {
    const filePath = resolve(context.cwd, input.file_path)

    try {
      const content = await readFile(filePath, 'utf-8')
      const notebook = JSON.parse(content)

      if (!notebook.cells || !Array.isArray(notebook.cells)) {
        return { data: 'Error: Invalid notebook format', is_error: true }
      }

      const { command, cell_number, cell_type, source } = input

      switch (command) {
        case 'insert': {
          const newCell = {
            cell_type: cell_type || 'code',
            source: (source || '').split('\n').map((l: string, i: number, arr: string[]) =>
              i < arr.length - 1 ? l + '\n' : l
            ),
            metadata: {},
            ...(cell_type !== 'markdown' ? { outputs: [], execution_count: null } : {}),
          }
          notebook.cells.splice(cell_number, 0, newCell)
          break
        }
        case 'replace': {
          if (cell_number >= notebook.cells.length) {
            return { data: `Error: Cell ${cell_number} does not exist`, is_error: true }
          }
          notebook.cells[cell_number].source = (source || '').split('\n').map(
            (l: string, i: number, arr: string[]) => i < arr.length - 1 ? l + '\n' : l
          )
          if (cell_type) notebook.cells[cell_number].cell_type = cell_type
          break
        }
        case 'delete': {
          if (cell_number >= notebook.cells.length) {
            return { data: `Error: Cell ${cell_number} does not exist`, is_error: true }
          }
          notebook.cells.splice(cell_number, 1)
          break
        }
      }

      await writeFile(filePath, JSON.stringify(notebook, null, 1), 'utf-8')
      return `Notebook ${command}: cell ${cell_number} in ${filePath}`
    } catch (err: any) {
      return { data: `Error: ${err.message}`, is_error: true }
    }
  },
})
