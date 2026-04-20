/**
 * Config Editor Types
 */

export type EditorPage = 'main' | 'edit' | 'select' | 'select_provider' | 'select_model';

export type FieldType = 'text' | 'number' | 'select';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  defaultValue: string;
  options?: FieldOption[];
  helpText?: string;
  section?: string;
}