declare module 'react-syntax-highlighter' {
  import * as React from 'react';

  export const Prism: React.ComponentType<Record<string, unknown>>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: Record<string, unknown>;
}
