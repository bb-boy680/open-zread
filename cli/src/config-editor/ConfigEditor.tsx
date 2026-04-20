import { Box, Text, useApp, useInput } from 'ink';
import React, { useEffect, useRef } from 'react';
import { saveConfig, getConfigPath } from '@open-zread/utils';
import type { AppConfig } from '@open-zread/types';
import { FIELDS } from './fields';
import { PROVIDER_PRESETS } from './providers';
import { useConfigEditor } from './use-config-editor';
import { EditPageContent } from './pages/EditPage';
import { SelectPageContent } from './pages/SelectPage';
import type { FieldDef } from './types';

interface ConfigEditorProps {
  initialConfig: AppConfig;
  onExit?: () => void;
}

function ConfigHeader({ configPath, isDirty }: { configPath: string; isDirty: boolean }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          Zread - 编辑配置
        </Text>
        <Text color="gray"> · </Text>
        <Text color="gray" dimColor>
          {configPath}
        </Text>
        {isDirty && (
          <>
            <Text color="gray"> · </Text>
            <Text color="yellow">[未保存]</Text>
          </>
        )}
      </Box>
      <Box>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>
    </Box>
  );
}

function Footer({ page }: { page: string }) {
  let hints: string;
  switch (page) {
    case 'edit':
      hints = 'enter: 确认  |  esc: 取消';
      break;
    case 'select':
      hints = '↑/↓: 导航  |  enter: 选择  |  esc: 返回';
      break;
    default:
      hints = '↑/↓: 导航  |  enter: 编辑  |  s: 保存  |  ctrl+c: 退出';
  }

  return (
    <Box marginTop={1}>
      <Text color="gray" dimColor>
        {hints}
      </Text>
    </Box>
  );
}

function getDisplayValue(field: FieldDef, values: Record<string, string>, llmModel: string): string {
  const value = values[field.key] ?? '';

  if (field.key === 'llm.api_key') {
    return value ? '•'.repeat(16) : '<未设置>';
  }

  if (field.key === 'llm.provider') {
    const preset = PROVIDER_PRESETS.find(p => p.value === value);
    if (preset) {
      return llmModel ? `${preset.label} · ${llmModel}` : preset.label;
    }
    return llmModel ? `${value} · ${llmModel}` : (value || '<未设置>');
  }

  if (field.type === 'select' && field.options) {
    const opt = field.options.find(o => o.value === value);
    return opt ? opt.label : (value || '<未设置>');
  }

  return value || '<未设置>';
}

/**
 * Renders a single config field item using Box + border for selection highlight.
 */
function ConfigFieldItem({
  field,
  value,
  isActive,
  isDirty,
  llmModel,
}: {
  field: FieldDef;
  value: string;
  isActive: boolean;
  isDirty: boolean;
  llmModel: string;
}) {
  const displayValue = getDisplayValue(field, { [field.key]: value }, llmModel);

  return (
    <Box
      borderLeft
      borderStyle="single"
      borderColor={isActive ? 'cyan' : 'black'}
      paddingLeft={1}
      paddingRight={1}
      borderRight={false}
      borderTop={false}
      borderBottom={false}
    >
      <Box flexDirection="column">
        <Box>
          <Text
            color={isActive ? 'cyan' : 'white'}
            bold={!isActive}
          >
            {field.label}
            {isActive ? ':' : ''}
          </Text>
          {field.helpText && (
            <Text color="gray" dimColor>
              {' '}{field.helpText}
            </Text>
          )}
        </Box>
        <Box>
          <Text
            color={isActive ? 'cyan' : 'gray'}
            dimColor={!isActive}
          >
            {displayValue}
          </Text>
          {isDirty && (
            <Text color="yellow" dimColor>
              {' '}[已修改]
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function ConfigEditor({ initialConfig, onExit }: ConfigEditorProps) {
  const { exit } = useApp();
  const configPath = getConfigPath();
  const { state, dispatch, isDirty, isFieldDirty, buildConfig, llmModel } =
    useConfigEditor(initialConfig);

  const saveTriggeredRef = useRef(false);

  // Auto-save effect
  useEffect(() => {
    if (state.page === 'main' && saveTriggeredRef.current) {
      saveTriggeredRef.current = false;
      (async () => {
        try {
          const config = buildConfig();
          await saveConfig(config);
          dispatch({ type: 'SAVE_SUCCESS' });
          setTimeout(() => {
            onExit?.();
            exit();
          }, 800);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          dispatch({ type: 'SAVE_ERROR', message });
        }
      })();
    }
  }, [state.page, buildConfig, dispatch, exit, onExit]);

  // Keyboard handling
  useInput((input, key) => {
    switch (state.page) {
      case 'main':
        if (key.upArrow || input === 'k') {
          dispatch({ type: 'MOVE_UP' });
        } else if (key.downArrow || input === 'j') {
          dispatch({ type: 'MOVE_DOWN' });
        } else if (key.return) {
          const field = FIELDS[state.activeFieldIndex];
          if (field.type === 'select') {
            dispatch({ type: 'OPEN_SELECT', index: state.activeFieldIndex });
          } else {
            dispatch({ type: 'OPEN_EDIT', index: state.activeFieldIndex });
          }
        } else if (input === 's') {
          saveTriggeredRef.current = true;
        }
        break;
      case 'edit':
      case 'select':
        // Sub-pages handle their own input
        break;
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <ConfigHeader configPath={configPath} isDirty={isDirty} />

      {state.page === 'main' && (
        <Box flexDirection="column">
          {(() => {
            let lastSection: string | undefined = undefined;
            const elements: React.ReactNode[] = [];

            for (let index = 0; index < FIELDS.length; index++) {
              const field = FIELDS[index];
              const isActive = index === state.activeFieldIndex;

              // Section header
              if (field.section !== lastSection) {
                lastSection = field.section;
                if (field.section) {
                  if (elements.length > 0) {
                    elements.push(<Box key={`${field.key}-gap`} height={1} />);
                  }
                  elements.push(
                    <Box key={`${field.key}-section`} paddingLeft={1}>
                      <Text color="blue" bold>
                        {field.section}
                      </Text>
                    </Box>,
                  );
                }
              }

              // Spacing between items
              if (index > 0) {
                elements.push(<Box key={`${field.key}-spacer`} height={1} />);
              }

              // Field item with Box border
              elements.push(
                <ConfigFieldItem
                  key={`${field.key}-item`}
                  field={field}
                  value={state.values[field.key] ?? ''}
                  isActive={isActive}
                  isDirty={isFieldDirty(field.key)}
                  llmModel={llmModel}
                />,
              );
            }

            return elements;
          })()}
        </Box>
      )}

      {state.page === 'edit' && (
        <EditPageContent
          field={FIELDS[state.activeFieldIndex]}
          value={state.editValue}
          error={state.editError}
          onChange={(v) => dispatch({ type: 'UPDATE_EDIT_VALUE', value: v })}
          onConfirm={() => dispatch({ type: 'CONFIRM_EDIT' })}
          onCancel={() => dispatch({ type: 'CLOSE_SUB_PAGE' })}
        />
      )}

      {state.page === 'select' && (
        <SelectPageContent
          field={FIELDS[state.activeFieldIndex]}
          selectedIndex={state.selectIndex}
          onSelect={(idx) => dispatch({ type: 'UPDATE_SELECT_INDEX', index: idx })}
          onConfirm={(value) => dispatch({ type: 'CONFIRM_SELECT', value })}
          onBack={() => dispatch({ type: 'CLOSE_SUB_PAGE' })}
        />
      )}

      {/* Save error */}
      {state.saveError && (
        <Box marginTop={1}>
          <Text color="red">保存失败: {state.saveError}</Text>
        </Box>
      )}

      <Footer page={state.page} />
    </Box>
  );
}
