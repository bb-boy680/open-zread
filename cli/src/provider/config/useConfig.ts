import { useContext } from 'react';
import { ConfigContext } from './config-provider';

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}