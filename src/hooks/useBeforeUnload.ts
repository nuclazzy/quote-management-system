import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface BeforeUnloadOptions {
  enabled?: boolean;
  message?: string;
  onBeforeUnload?: () => void;
}

export function useBeforeUnload({
  enabled = true,
  message = '저장되지 않은 변경사항이 있습니다. 정말 페이지를 떠나시겠습니까?',
  onBeforeUnload,
}: BeforeUnloadOptions = {}) {
  const router = useRouter();
  const enabledRef = useRef(enabled);

  // enabled 상태 업데이트
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // 브라우저 새로고침/닫기 방지
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current) return;

      onBeforeUnload?.();

      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [message, onBeforeUnload]);

  // Next.js 라우터 변경 방지
  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (!enabledRef.current) return;

      const isConfirmed = window.confirm(message);
      if (!isConfirmed) {
        // 라우트 변경 중단
        router.events?.emit('routeChangeError');
        throw 'Route change aborted';
      }

      onBeforeUnload?.();
    };

    // Next.js 13 App Router에서는 router.events가 없으므로
    // 대신 history API를 직접 사용
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      if (enabledRef.current) {
        const isConfirmed = window.confirm(message);
        if (!isConfirmed) {
          return;
        }
        onBeforeUnload?.();
      }
      return originalPushState.apply(history, args);
    };

    history.replaceState = function (...args) {
      if (enabledRef.current) {
        const isConfirmed = window.confirm(message);
        if (!isConfirmed) {
          return;
        }
        onBeforeUnload?.();
      }
      return originalReplaceState.apply(history, args);
    };

    // 뒤로가기 감지
    const handlePopState = (event: PopStateEvent) => {
      if (!enabledRef.current) return;

      const isConfirmed = window.confirm(message);
      if (!isConfirmed) {
        // 뒤로가기 취소
        history.pushState(null, '', window.location.href);
        return;
      }

      onBeforeUnload?.();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      // 원래 함수 복원
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [message, onBeforeUnload, router]);

  // 수동으로 보호 상태 변경
  const setEnabled = (value: boolean) => {
    enabledRef.current = value;
  };

  return {
    setEnabled,
  };
}

// 폼 데이터 변경 감지를 위한 훅
export function useFormProtection(
  isDirty: boolean,
  options?: BeforeUnloadOptions
) {
  return useBeforeUnload({
    ...options,
    enabled: isDirty && (options?.enabled ?? true),
  });
}
