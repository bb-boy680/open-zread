// apps/browse/src/hooks/useWiki.ts
import { useContext } from 'react';
import { WikiContext } from '@/context/WikiContext';

export function useWiki() {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWiki must be used within WikiProvider');
  }
  return context;
}
