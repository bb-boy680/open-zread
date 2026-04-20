import { useState, useEffect } from 'react';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Spinner 动画 hook
 * @param isRunning - 是否正在运行
 * @returns 当前帧字符
 */
export function useSpinner(isRunning: boolean): string {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, 80);

    return () => clearInterval(timer);
  }, [isRunning]);

  return FRAMES[frame];
}