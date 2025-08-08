'use client';

import { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Description,
  People,
  Business,
  Inventory,
  Analytics,
  Settings,
  AdminPanelSettings,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useStaticAuth } from '@/contexts/StaticAuthContext';
import ThemeToggle from '@/components/common/ThemeToggle';

const drawerWidth = 240;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { text: '대시보드', icon: <Dashboard />, path: '/dashboard' },
  { text: '견적서', icon: <Description />, path: '/quotes' },
  { text: '클라이언트', icon: <People />, path: '/clients' },
  { text: '공급처', icon: <Business />, path: '/suppliers' },
  { text: '품목 관리', icon: <Inventory />, path: '/items' },
  { text: '프로젝트', icon: <Analytics />, path: '/projects' },
  { text: '정산 관리', icon: <Analytics />, path: '/revenue', adminOnly: true },
  {
    text: '시스템 설정',
    icon: <Settings />,
    path: '/admin/settings',
    adminOnly: true,
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, adminLogout } = useStaticAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleAdminLogout = () => {
    adminLogout();
    router.push('/dashboard');
  };


  const drawer = (
    <div>
      <Toolbar>
        <Typography variant='h6' noWrap component='div'>
          견적서 시스템
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position='fixed'
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='네비게이션 메뉴 열기'
            edge='start'
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant='h6' noWrap component='div' sx={{ flexGrow: 1 }}>
            {navItems.find((item) => item.path === pathname)?.text ||
              '견적서 관리 시스템'}
          </Typography>

          {isAdmin && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  mr: 2,
                  borderRadius: 1,
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <AdminPanelSettings fontSize="small" />
                <Typography variant="body2" fontWeight="bold">
                  관리자 모드
                </Typography>
              </Box>
              <IconButton
                color="inherit"
                onClick={handleAdminLogout}
                sx={{ mr: 2 }}
                title="관리자 로그아웃"
              >
                <LogoutIcon />
              </IconButton>
            </>
          )}

          <ThemeToggle />
        </Toolbar>
      </AppBar>

      <Box
        component='nav'
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant='temporary'
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          aria-label='모바일 네비게이션 메뉴'
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant='permanent'
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component='main'
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
