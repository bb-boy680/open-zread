/**
 * App - TUI 应用入口，所有路由统一管理
 */

import { Box, render } from "ink";
import { withFullScreen } from "fullscreen-ink";
import { MemoryRouter, Routes, Route } from "react-router";
import { I18nProvider } from "./i18n";
import { ConfigProvider, EscHandlerProvider, WikiProvider } from "./provider";
import Layout from "./layout/layout";
import ConfigLayout from "./layout/config-layout";

// Config 模块页面
import ConfigHomePage from "./views/config-home";
import ConfigLanguagePage from "./views/config-language";
import ConfigDocLanguagePage from "./views/config-doc-language";
import ConfigProviderPage from "./views/config-provider";
import ConfigModelPage from "./views/config-model";
import ConfigApiKeyPage from "./views/config-apikey";
import ConfigCustomProviderPage from "./views/config-custom-provider";
import ConfigConcurrencyPage from "./views/config-concurrency";
import ConfigRetryPage from "./views/config-retry";

// Wiki 模块页面
import WikiHomePage from "./views/wiki-home";
import WikiGeneratePage from "./views/wiki-generate";

interface AppOptions {
  initialEntries: string[];
}

function AppContent({ initialEntries }: AppOptions) {
  return (
    <Box flexGrow={1} flexDirection="column">
      <I18nProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <EscHandlerProvider>
            <ConfigProvider>
              <Routes>
                {/* 统一 Layout，处理 ESC 返回 */}
                <Route element={<Layout />}>
                  {/* ========== Config 模块路由 ========== */}
                  <Route path="/config" element={<ConfigHomePage />} />
                  {/* 子页面使用 ConfigLayout，统一 header */}
                  <Route element={<ConfigLayout />}>
                    <Route
                      path="/config/language"
                      element={<ConfigLanguagePage />}
                    />
                    <Route
                      path="/config/doc_language"
                      element={<ConfigDocLanguagePage />}
                    />
                    <Route
                      path="/config/provider"
                      element={<ConfigProviderPage />}
                    />
                    {/* 注意：具体路径要在参数化路径之前，否则 'custom' 会被当作 providerId */}
                    <Route
                      path="/config/provider/custom"
                      element={<ConfigCustomProviderPage />}
                    />
                    <Route
                      path="/config/provider/:providerId"
                      element={<ConfigModelPage />}
                    />
                    <Route
                      path="/config/provider/:providerId/model/:modelId"
                      element={<ConfigApiKeyPage />}
                    />
                    <Route
                      path="/config/provider/:providerId/custom"
                      element={<ConfigCustomProviderPage />}
                    />
                    <Route
                      path="/config/concurrency"
                      element={<ConfigConcurrencyPage />}
                    />
                    <Route path="/config/retry" element={<ConfigRetryPage />} />
                  </Route>
                  {/* ========== Wiki 模块路由 ========== */}
                  <Route element={<WikiProvider />}>
                    <Route path="/wiki" element={<WikiHomePage />} />
                    <Route
                      path="/wiki/generate"
                      element={<WikiGeneratePage />}
                    />
                  </Route>
                </Route>
              </Routes>
            </ConfigProvider>
          </EscHandlerProvider>
        </MemoryRouter>
      </I18nProvider>
    </Box>
  );
}

export function App({ initialEntries }: AppOptions) {
  withFullScreen(<AppContent initialEntries={initialEntries} />, {
    exitOnCtrlC: true,
  }).start();
}
