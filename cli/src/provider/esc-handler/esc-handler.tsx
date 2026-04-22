/**
 * EscContext - ESC 键处理优先级协调
 *
 * Ink 的 useInput 会同时触发所有处理函数，
 * 通过 Context 让子页面声明是否需要优先处理 ESC。
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface EscHandlerContext {
  /** 子页面是否正在处理 ESC（如搜索模式） */
  isChildHandling: boolean;
  /** 子页面声明优先处理 ESC */
  claimEsc: () => void;
  /** 子页面释放 ESC 处理权 */
  releaseEsc: () => void;
}

const EscContext = createContext<EscHandlerContext | null>(null);

export function useEscHandler() {
  const context = useContext(EscContext);
  if (!context) {
    throw new Error('useEscHandler must be used within EscHandlerProvider');
  }
  return context;
}

export function EscHandlerProvider({ children }: { children: ReactNode }) {
  const [isChildHandling, setIsChildHandling] = useState(false);

  const claimEsc = useCallback(() => setIsChildHandling(true), []);
  const releaseEsc = useCallback(() => setIsChildHandling(false), []);

  return (
    <EscContext.Provider value={{ isChildHandling, claimEsc, releaseEsc }}>
      {children}
    </EscContext.Provider>
  );
}