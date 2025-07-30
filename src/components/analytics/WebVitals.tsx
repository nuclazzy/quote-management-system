'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/analytics';

export function WebVitals() {
  useEffect(() => {
    // 페이지 로드 후 Web Vitals 리포팅 시작
    reportWebVitals();
  }, []);

  return null;
}

export default WebVitals;
