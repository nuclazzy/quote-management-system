'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { 
  CircularProgress, 
  Box, 
  Skeleton,
  Typography 
} from '@mui/material';

// 로딩 컴포넌트들
const LoadingSpinner = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
    <CircularProgress />
  </Box>
);

const LoadingSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={100} />
  </Box>
);

const LoadingCard = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Skeleton variant="rounded" width={80} height={24} />
      <Skeleton variant="rounded" width={100} height={24} />
    </Box>
  </Box>
);

// Dynamic imports with loading states
export const LazyMasterItemSelector = dynamic(
  () => import('./MasterItemSelectorOptimized'),
  {
    loading: () => <LoadingSkeleton />,
    ssr: false // 클라이언트 사이드에서만 로드
  }
);

export const LazyTemplateSelector = dynamic(
  () => import('../TemplateSelector'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyQuotePreviewModal = dynamic(
  () => import('../QuotePreviewModal'),
  {
    loading: () => <LoadingSkeleton />,
    ssr: false
  }
);

export const LazyPDFDownloadButton = dynamic(
  () => import('../PDFDownloadButton'),
  {
    loading: () => (
      <Box sx={{ width: 120, height: 36 }}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    ),
    ssr: false
  }
);

// Heavy components that should be lazy loaded
export const LazyVirtualizedList = dynamic(
  () => import('./VirtualizedList'),
  {
    loading: () => <LoadingSkeleton />,
    ssr: false
  }
);

export const LazyPerformanceProfiler = dynamic(
  () => import('../../common/PerformanceProfiler'),
  {
    loading: () => <></>,
    ssr: false
  }
);

// Chart components (if any)
export const LazyChartComponent = dynamic(
  () => import('../../common/Chart').catch(() => ({ default: () => <div>차트를 불러올 수 없습니다.</div> })),
  {
    loading: () => (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    ),
    ssr: false
  }
);

// Wrapper components with error boundaries
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  error?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <LoadingSpinner />,
  error = <Typography color="error">컴포넌트를 불러오는데 실패했습니다.</Typography>
}) => {
  return (
    <Suspense fallback={fallback}>
      <ErrorBoundary fallback={error}>
        {children}
      </ErrorBoundary>
    </Suspense>
  );
};

// Simple Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Preload functions for critical components
export const preloadComponents = {
  masterItemSelector: () => import('./MasterItemSelectorOptimized'),
  templateSelector: () => import('../TemplateSelector'),
  pdfDownload: () => import('../PDFDownloadButton'),
  virtualizedList: () => import('./VirtualizedList')
};

// Hook for preloading components
export function usePreloadComponents() {
  const preload = React.useCallback((componentName: keyof typeof preloadComponents) => {
    preloadComponents[componentName]().catch(error => {
      console.warn(`Failed to preload ${componentName}:`, error);
    });
  }, []);

  const preloadAll = React.useCallback(() => {
    Object.values(preloadComponents).forEach(loader => {
      loader().catch(error => {
        console.warn('Failed to preload component:', error);
      });
    });
  }, []);

  return { preload, preloadAll };
}