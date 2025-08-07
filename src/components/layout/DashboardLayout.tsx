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
  Avatar,
  Menu,
  MenuItem,
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
  Logout,
  AccountCircle,
  AdminPanelSettings,
  ManageAccounts,
  Notifications,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
    text: '사용자 관리',
    icon: <ManageAccounts />,
    path: '/admin/users',
    adminOnly: true,
  },
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleUserMenuClose();
    await signOut();
    router.push('/auth/login');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const isAdmin = user?.profile?.role === 'admin';

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

          <ThemeToggle />

          <IconButton
            size='large'
            edge='end'
            aria-label='사용자 계정 메뉴'
            aria-controls='user-menu'
            aria-haspopup='true'
            aria-expanded={Boolean(anchorEl)}
            onClick={handleUserMenuOpen}
            color='inherit'
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.profile?.full_name?.[0] || <AccountCircle />}
            </Avatar>
          </IconButton>

          <Menu
            id='user-menu'
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem disabled>
              <Typography variant='body2'>
                {user?.profile?.full_name || user?.email}
              </Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant='caption' color='textSecondary'>
                {user?.profile?.role === 'admin' ? '관리자' : '일반 사용자'}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize='small' />
              </ListItemIcon>
              로그아웃
            </MenuItem>
          </Menu>
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
