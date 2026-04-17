/**
 * NotebookEditTool - Edit Jupyter notebooks
 */

import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { defineTool, getRequiredString, getString, getNumber } from './types.js'

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
    const filePath = resolve(context.cwd, getRequiredString(input, 'file_path'))

    try {
      const content = await readFile(filePath, 'utf-8')
      const notebook = JSON.parse(content)

      if (!notebook.cells || !Array.isArray(notebook.cells)) {
        return { data: 'Error: Invalid notebook format', is_error: true }
      }

      const command = getRequiredString(input, 'command')
      const cellNumber = getNumber(input, 'cell_number')
      const cellType = getString(input, 'cell_type')
      const source = getString(input, 'source')

      if (cellNumber === undefined) {
        return { data: 'Error: cell_number is required', is_error: true }
      }

      switch (command) {
        case 'insert': {
          const newCell = {
            cell_type: cellType || 'code',
            source: (source || '').split('\n').map((l: string, i: number, arr: string[]) =>
              i < arr.length - 1 ? l + '\n' : l
            ),
            metadata: {},
            ...(cellType !== 'markdown' ? { outputs: [], execution_count: null } : {}),
          }
          notebook.cells.splice(cellNumber, 0, newCell)
          break
        }
        case 'replace': {
          if (cellNumber >= notebook.cells.length) {
            return { data: `Error: Cell ${cellNumber} does not exist`, is_error: true }
          }
          notebook.cells[cellNumber].source = (source || '').split('\n').map(
            (l: string, i: number, arr: string[]) => i < arr.length - 1 ? l + '\n' : l
          )
          if (cellType) notebook.cells[cellNumber].cell_type = cellType
          break
        }
        case 'delete': {
          if (cellNumber >= notebook.cells.length) {
            return { data: `Error: Cell ${cellNumber} does not exist`, is_error: true }
          }
          notebook.cells.splice(cellNumber, 1)
          break
        }
      }

      await writeFile(filePath, JSON.stringify(notebook, null, 1), 'utf-8')
      return `Notebook ${command}: cell ${cellNumber} in ${filePath}`
    } catch (err: unknown) {
      return { data: `Error: ${err instanceof Error ? err.message : String(err)}`, is_error: true }
    }
  },
})
