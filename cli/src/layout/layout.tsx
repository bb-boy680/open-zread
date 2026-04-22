/**
 * Layout - 统一布局，处理 ESC 返回
 *
 * 大多数页面的 ESC 返回逻辑由 Layout 统一处理。
 * 特殊页面（如搜索模式）通过 EscContext 声明优先处理。
 */

import { Box, useInput, useApp } from 'ink';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useEscHandler } from '../provider';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exit } = useApp();
  const { isChildHandling } = useEscHandler();

  useInput((input, key) => {
    if (key.escape && !isChildHandling) {
      // 根据当前路径判断退出行为
      const isRootPage = location.pathname === '/' ||
                         location.pathname === '/config' ||
                         location.pathname === '/wiki';

      if (isRootPage) {
        exit();
      } else {
        navigate(-1);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Outlet />
    </Box>
  );
}