/**
 * Config Command - Interactive Config Editor
 */

import { render } from 'ink';
import { ConfigEditorWrapper } from '../config-editor/ConfigEditorWrapper';

export async function runConfig() {
  const { waitUntilExit } = render(<ConfigEditorWrapper />);
  await waitUntilExit();
}