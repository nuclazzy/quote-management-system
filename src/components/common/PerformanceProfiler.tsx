'use client';

import React, { Profiler, ReactNode } from 'react';

interface PerformanceProfilerProps {
  id: string;
  children: ReactNode;
  onRender?: (id: string, phase: 'mount' | 'update', duration: number) => void;
}

const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({ 
  id, 
  children, 
  onRender 
}) => {
  const handleRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Development 환경에서만 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [Performance] ${id}:`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        startTime: `${startTime.toFixed(2)}ms`,
        commitTime: `${commitTime.toFixed(2)}ms`,
        efficiency: `${((baseDuration / actualDuration) * 100).toFixed(1)}%`
      });
    }

    // 사용자 정의 콜백 실행
    onRender?.(id, phase, actualDuration);
  };

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
};

export default PerformanceProfiler;