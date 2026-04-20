import { useCallback, useMemo, useReducer } from 'react';
import type { AppConfig } from '@open-zread/types';
import { FIELDS, flattenConfig, unflattenConfig } from './fields';
import type { EditorPage } from './types';
import type { ProviderInfo, ModelInfo } from '@open-zread/utils'

interface EditorState {
  page: EditorPage;
  activeFieldIndex: number;
  values: Record<string, string>;
  originalValues: Record<string, string>;
  editValue: string;
  editError: string | null;
  selectIndex: number;
  saveError: string | null;
  // Provider/Model 选择相关
  providers: ProviderInfo[];
  models: ModelInfo[];
  selectedProvider: ProviderInfo | null;
}

type EditorAction =
  | { type: 'MOVE_UP' }
  | { type: 'MOVE_DOWN' }
  | { type: 'OPEN_EDIT'; index: number }
  | { type: 'OPEN_SELECT'; index: number }
  | { type: 'CLOSE_SUB_PAGE' }
  | { type: 'UPDATE_EDIT_VALUE'; value: string }
  | { type: 'CONFIRM_EDIT' }
  | { type: 'CONFIRM_SELECT'; value: string }
  | { type: 'UPDATE_SELECT_INDEX'; index: number }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; message: string }
  // Provider/Model 选择相关
  | { type: 'OPEN_SELECT_PROVIDER'; providers: ProviderInfo[] }
  | { type: 'OPEN_SELECT_MODEL'; provider: ProviderInfo; models: ModelInfo[] }
  | { type: 'CONFIRM_SELECT_PROVIDER'; provider: ProviderInfo }
  | { type: 'CONFIRM_SELECT_MODEL'; model: ModelInfo }
  | { type: 'SET_PROVIDERS'; providers: ProviderInfo[] };

function reducer(state: EditorState, action: EditorAction): EditorState {
  const fieldCount = FIELDS.length;

  switch (action.type) {
    case 'MOVE_UP':
      if (state.page !== 'main') return state;
      return {
        ...state,
        activeFieldIndex: state.activeFieldIndex > 0 ? state.activeFieldIndex - 1 : fieldCount - 1,
      };

    case 'MOVE_DOWN':
      if (state.page !== 'main') return state;
      return {
        ...state,
        activeFieldIndex: state.activeFieldIndex < fieldCount - 1 ? state.activeFieldIndex + 1 : 0,
      };

    case 'OPEN_EDIT':
      if (state.page !== 'main') return state;
      return {
        ...state,
        page: 'edit',
        editValue: state.values[FIELDS[action.index].key] ?? '',
        editError: null,
      };

    case 'OPEN_SELECT': {
      if (state.page !== 'main') return state;
      // Find the index of the option matching the current value
      const field = FIELDS[action.index];
      let optIndex = 0;
      if (field.options) {
        const idx = field.options.findIndex(o => o.value === state.values[field.key]);
        if (idx >= 0) optIndex = idx;
      }
      return {
        ...state,
        page: 'select',
        activeFieldIndex: action.index,
        selectIndex: optIndex,
      };
    }

    case 'CLOSE_SUB_PAGE':
      return { ...state, page: 'main', editError: null };

    case 'UPDATE_EDIT_VALUE':
      return { ...state, editValue: action.value, editError: null };

    case 'CONFIRM_EDIT': {
      if (state.page !== 'edit') return state;
      const key = FIELDS[state.activeFieldIndex].key;
      const field = FIELDS[state.activeFieldIndex];
      const value = state.editValue.trim();

      // Validate number fields
      if (field.type === 'number' && (value === '' || isNaN(Number(value)))) {
        return { ...state, editError: '请输入有效的数字' };
      }

      const newValues = { ...state.values, [key]: value };
      return { ...state, page: 'main', values: newValues };
    }

    case 'CONFIRM_SELECT': {
      if (state.page !== 'select') return state;
      const key = FIELDS[state.activeFieldIndex].key;
      const newValues = { ...state.values, [key]: action.value };
      return { ...state, page: 'main', values: newValues };
    }

    case 'UPDATE_SELECT_INDEX':
      return { ...state, selectIndex: action.index };

    case 'SAVE':
      if (state.page !== 'main') return state;
      return { ...state, saveError: null };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        originalValues: { ...state.values },
        saveError: null,
      };

    case 'SAVE_ERROR':
      return { ...state, saveError: action.message };

    // Provider/Model 选择相关
    case 'OPEN_SELECT_PROVIDER':
      return {
        ...state,
        page: 'select_provider',
        providers: action.providers,
        selectIndex: 0,
      };

    case 'OPEN_SELECT_MODEL':
      return {
        ...state,
        page: 'select_model',
        selectedProvider: action.provider,
        models: action.models,
        selectIndex: 0,
      };

    case 'CONFIRM_SELECT_PROVIDER':
      return {
        ...state,
        page: 'select_model', // 选择 Provider 后跳转到 Model 选择
        selectedProvider: action.provider,
        values: {
          ...state.values,
          'llm.provider': action.provider.id,
          '_llm.base_url': action.provider.base_url || '',
        },
        selectIndex: 0,
      };

    case 'CONFIRM_SELECT_MODEL':
      return {
        ...state,
        page: 'main',
        values: {
          ...state.values,
          'llm.provider': state.selectedProvider?.id || state.values['llm.provider'],
          'llm.model': action.model.id,
          '_llm.base_url': state.selectedProvider?.base_url || state.values['_llm.base_url'] || '',
        },
        selectedProvider: null,
      };

    case 'SET_PROVIDERS':
      return { ...state, providers: action.providers };

    default:
      return state;
  }
}

export function useConfigEditor(initialConfig: AppConfig) {
  const initialValues = useMemo(
    () => flattenConfig(initialConfig as unknown as Record<string, unknown>),
    [],
  );

  const llmModel = useMemo(() => {
    const llm = (initialConfig as unknown as Record<string, unknown>)?.llm;
    if (typeof llm === 'object' && llm !== null && 'model' in llm) {
      return String(llm.model);
    }
    return '';
  }, []);

  const [state, dispatch] = useReducer(reducer, {
    page: 'main' as EditorPage,
    activeFieldIndex: 0,
    values: { ...initialValues },
    originalValues: { ...initialValues },
    editValue: '',
    editError: null,
    selectIndex: 0,
    saveError: null,
    providers: [],
    models: [],
    selectedProvider: null,
  });

  const isDirty = useMemo(() => {
    for (const key of Object.keys(state.values)) {
      if (state.values[key] !== state.originalValues[key]) {
        return true;
      }
    }
    return false;
  }, [state.values, state.originalValues]);

  const currentField = FIELDS[state.activeFieldIndex];

  const isFieldDirty = useCallback(
    (key: string) => state.values[key] !== state.originalValues[key],
    [state.values, state.originalValues],
  );

  const buildConfig = useCallback((): AppConfig => {
    const raw = unflattenConfig(state.values, initialConfig as unknown as Record<string, unknown>);
    // Inject auto-filled base_url from provider selection
    const baseUrl = state.values['_llm.base_url'];
    if (baseUrl) {
      (raw.llm as Record<string, unknown>).base_url = baseUrl;
    }
    // Inject model if set
    const model = state.values['llm.model'];
    if (model) {
      (raw.llm as Record<string, unknown>).model = model;
    }
    return raw as unknown as AppConfig;
  }, [state.values, initialConfig]);

  return {
    state,
    dispatch,
    isDirty,
    currentField,
    isFieldDirty,
    buildConfig,
    llmModel,
  };
}