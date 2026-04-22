/**
 * App - TUI 应用入口，所有路由统一管理
 */

import { render } from 'ink';
import { MemoryRouter, Routes, Route } from 'react-router';
import { I18nProvider } from './i18n';
import { ConfigProvider } from './provider';
import Layout from './layout/layout';

// Config 模块页面
import ConfigHomePage from './views/config-home';
import ConfigLanguagePage from './views/config-language';
import ConfigDocLanguagePage from './views/config-doc-language';
import ConfigProviderPage from './views/config-provider';
import ConfigConcurrencyPage from './views/config-concurrency';
import ConfigRetryPage from './views/config-retry';

// Wiki 模块页面（待实现）
// import WikiHomePage from './views/wiki-home';

interface AppOptions {
  initialEntries: string[];
}

export function App({ initialEntries }: AppOptions) {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          {/* 统一 Layout，处理 ESC 返回 */}
          <Route element={<Layout />}>
            {/* ========== Config 模块路由 ========== */}
            <Route element={<ConfigProvider />}>
              <Route path="/config" element={<ConfigHomePage />} />
              <Route path="/config/language" element={<ConfigLanguagePage />} />
              <Route path="/config/doc_language" element={<ConfigDocLanguagePage />} />
              <Route path="/config/provider" element={<ConfigProviderPage />} />
              <Route path="/config/concurrency" element={<ConfigConcurrencyPage />} />
              <Route path="/config/retry" element={<ConfigRetryPage />} />
            </Route>
            {/* ========== Wiki 模块路由 ========== */}
            {/* <Route path="/wiki" element={<WikiHomePage />} /> */}
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
}