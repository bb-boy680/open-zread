/**
 * Layout - 统一布局，处理 ESC 返回
 */

import { Box, useInput } from 'ink';
import { useNavigate, useLocation, Outlet } from 'react-router';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  useInput((input, key) => {
    if (key.escape) {
      // 根据当前路径判断退出行为
      const isRootPage = location.pathname === '/' ||
                         location.pathname === '/config' ||
                         location.pathname === '/wiki';

      if (isRootPage) {
        process.exit(0);
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