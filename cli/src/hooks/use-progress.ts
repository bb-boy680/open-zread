import { useEffect, useState } from 'react';
import { uiStore, UIState } from '../state';

export function useProgress(): UIState {
  const [state, setState] = useState<UIState>(uiStore.getState());

  useEffect(() => {
    return uiStore.subscribe(setState);
  }, []);

  return state;
}
