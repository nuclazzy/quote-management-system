// ========================================
// 견적서 자동저장 성능 최적화
// AUTO_SAVE_OPTIMIZATION.js
// ========================================

import { useCallback, useRef, useEffect, useState } from 'react';
import { debounce, throttle } from 'lodash';
import { toast } from 'react-toastify';

// ========================================
// 1. 자동저장 Hook (Debounce + 낙관적 잠금)
// ========================================

export const useAutoSave = (
  quoteId,
  initialData,
  onSave,
  options = {}
) => {
  const {
    debounceMs = 2000,    // 2초 후 저장 시도
    throttleMs = 30000,   // 최대 30초마다 강제 저장
    maxRetries = 3,       // 최대 재시도 횟수
    conflictRetryMs = 5000 // 충돌 시 재시도 간격
  } = options;

  const [data, setData] = useState(initialData);
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error', 'conflict'
  
  const lastSaveAttempt = useRef(0);
  const retryCount = useRef(0);
  const saveVersion = useRef(0);
  const conflictResolver = useRef(null);

  // ========================================
  // 2. 충돌 감지 및 해결
  // ========================================

  const handleSaveConflict = useCallback(async (localData, serverData, conflictInfo) => {
    setSaveStatus('conflict');
    
    // 자동 병합 시도
    const mergeStrategy = detectMergeStrategy(localData, serverData);
    
    if (mergeStrategy === 'auto_merge') {
      const mergedData = await autoMergeQuoteData(localData, serverData);
      if (mergedData) {
        setData(mergedData);
        return mergedData;
      }
    }
    
    // 사용자 개입 필요
    return new Promise((resolve) => {
      conflictResolver.current = resolve;
      // 충돌 해결 UI 표시
      showConflictResolutionDialog({
        localData,
        serverData,
        conflictInfo,
        onResolve: (resolvedData) => {
          conflictResolver.current?.(resolvedData);
          conflictResolver.current = null;
        }
      });
    });
  }, []);

  // ========================================
  // 3. 지능형 저장 함수
  // ========================================

  const performSave = useCallback(async (dataToSave, isForced = false) => {
    if (isAutoSaving && !isForced) return;
    
    setIsAutoSaving(true);
    setSaveStatus('saving');
    
    try {
      const savePayload = {
        quoteId,
        data: dataToSave,
        version: saveVersion.current,
        lastModified: lastSaved,
        changesSummary: generateChangesSummary(initialData, dataToSave)
      };

      const response = await fetch(`/api/quotes/${quoteId}/auto-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload)
      });

      const result = await response.json();

      if (response.ok) {
        // 저장 성공
        saveVersion.current = result.version;
        setLastSaved(Date.now());
        setSaveStatus('saved');
        retryCount.current = 0;
        
        // 성공 시 onChange 콜백 호출
        onSave?.(dataToSave, result);
        
        return true;
      } else if (response.status === 409) {
        // 충돌 발생
        const resolvedData = await handleSaveConflict(
          dataToSave, 
          result.serverData, 
          result.conflictInfo
        );
        
        if (resolvedData) {
          // 해결된 데이터로 재시도
          return performSave(resolvedData, true);
        }
        return false;
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');
      
      // 재시도 로직
      retryCount.current++;
      if (retryCount.current <= maxRetries) {
        setTimeout(() => {
          performSave(dataToSave, true);
        }, Math.min(1000 * Math.pow(2, retryCount.current), 10000));
      } else {
        // 최대 재시도 초과 시 사용자에게 알림
        toast.error('자동 저장에 실패했습니다. 수동으로 저장해주세요.', {
          toastId: 'autosave-failed',
          autoClose: false
        });
      }
      
      return false;
    } finally {
      setIsAutoSaving(false);
    }
  }, [quoteId, lastSaved, isAutoSaving, handleSaveConflict, onSave, maxRetries]);

  // ========================================
  // 4. Debounced 자동저장
  // ========================================

  const debouncedSave = useCallback(
    debounce((dataToSave) => {
      lastSaveAttempt.current = Date.now();
      performSave(dataToSave);
    }, debounceMs),
    [performSave, debounceMs]
  );

  // ========================================
  // 5. Throttled 강제저장 (최대 대기 시간 제한)
  // ========================================

  const throttledSave = useCallback(
    throttle((dataToSave) => {
      performSave(dataToSave, true);
    }, throttleMs),
    [performSave, throttleMs]
  );

  // ========================================
  // 6. 데이터 업데이트 함수
  // ========================================

  const updateData = useCallback((updatedData, immediate = false) => {
    setData(updatedData);
    
    if (immediate) {
      // 즉시 저장
      debouncedSave.cancel();
      performSave(updatedData, true);
    } else {
      // 자동저장 예약
      debouncedSave(updatedData);
      throttledSave(updatedData);
    }
  }, [debouncedSave, throttledSave, performSave]);

  // ========================================
  // 7. 페이지 종료 시 저장 보장
  // ========================================

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'saving' || hasUnsavedChanges(data, initialData)) {
        e.preventDefault();
        e.returnValue = '저장되지 않은 변경사항이 있습니다.';
        
        // 동기적 저장 시도
        navigator.sendBeacon(
          `/api/quotes/${quoteId}/emergency-save`,
          JSON.stringify({
            data,
            version: saveVersion.current,
            timestamp: Date.now()
          })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges(data, initialData)) {
        // 페이지가 숨겨질 때 즉시 저장
        performSave(data, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      debouncedSave.cancel();
    };
  }, [data, initialData, quoteId, saveStatus, debouncedSave, performSave]);

  // ========================================
  // 8. 정기적 건강성 체크
  // ========================================

  useEffect(() => {
    const healthCheck = setInterval(() => {
      const timeSinceLastSave = Date.now() - lastSaved;
      const timeSinceLastAttempt = Date.now() - lastSaveAttempt.current;
      
      // 5분 이상 저장되지 않았고, 변경사항이 있는 경우
      if (timeSinceLastSave > 300000 && hasUnsavedChanges(data, initialData)) {
        if (timeSinceLastAttempt > 60000) { // 마지막 시도 후 1분 이상 경과
          toast.warning('자동 저장이 지연되고 있습니다. 수동으로 저장해주세요.');
          performSave(data, true);
        }
      }
    }, 60000); // 1분마다 체크

    return () => clearInterval(healthCheck);
  }, [data, initialData, lastSaved, performSave]);

  return {
    data,
    updateData,
    saveStatus,
    isAutoSaving,
    lastSaved: new Date(lastSaved),
    forceSave: () => performSave(data, true),
    hasUnsavedChanges: hasUnsavedChanges(data, initialData)
  };
};

// ========================================
// 9. 유틸리티 함수들
// ========================================

function detectMergeStrategy(localData, serverData) {
  // 간단한 병합 가능성 검사
  const localKeys = new Set(Object.keys(flattenObject(localData)));
  const serverKeys = new Set(Object.keys(flattenObject(serverData)));
  
  const conflictKeys = [...localKeys].filter(key => 
    serverKeys.has(key) && 
    JSON.stringify(getNestedValue(localData, key)) !== JSON.stringify(getNestedValue(serverData, key))
  );
  
  // 충돌이 적고 단순한 경우 자동 병합
  if (conflictKeys.length <= 3 && conflictKeys.every(isSimpleValue)) {
    return 'auto_merge';
  }
  
  return 'manual_resolve';
}

async function autoMergeQuoteData(localData, serverData) {
  try {
    // 타임스탬프 기반 병합
    const mergedData = { ...serverData };
    
    // 로컬 변경사항 중 더 최신인 것만 적용
    if (localData.lastModified > serverData.lastModified) {
      // 특정 필드는 로컬 우선
      const localPriorityFields = ['notes', 'projectTitle', 'status'];
      localPriorityFields.forEach(field => {
        if (localData[field] !== serverData[field]) {
          mergedData[field] = localData[field];
        }
      });
    }
    
    // 구조 데이터는 신중하게 처리
    if (JSON.stringify(localData.groups) !== JSON.stringify(serverData.groups)) {
      // 구조 변경은 수동 해결 필요
      return null;
    }
    
    return mergedData;
  } catch (error) {
    console.error('Auto-merge failed:', error);
    return null;
  }
}

function generateChangesSummary(oldData, newData) {
  const changes = [];
  
  // 기본 정보 변경 확인
  if (oldData.projectTitle !== newData.projectTitle) {
    changes.push({ field: 'projectTitle', type: 'update' });
  }
  
  if (oldData.status !== newData.status) {
    changes.push({ field: 'status', type: 'update' });
  }
  
  // 구조 변경 확인 (간단한 비교)
  if (JSON.stringify(oldData.groups) !== JSON.stringify(newData.groups)) {
    changes.push({ field: 'structure', type: 'update' });
  }
  
  return changes;
}

function hasUnsavedChanges(currentData, savedData) {
  return JSON.stringify(currentData) !== JSON.stringify(savedData);
}

function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function isSimpleValue(key) {
  // 간단한 값인지 확인 (문자열, 숫자, 불린)
  return !key.includes('groups') && !key.includes('items') && !key.includes('details');
}

// ========================================
// 10. 충돌 해결 다이얼로그
// ========================================

function showConflictResolutionDialog({ localData, serverData, conflictInfo, onResolve }) {
  // React Portal을 사용한 모달 표시
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="auto-save-conflict-modal">
      <h3>저장 충돌 발생</h3>
      <p>다른 사용자가 동시에 수정했습니다. 해결 방법을 선택하세요:</p>
      <div class="conflict-options">
        <button onclick="resolveConflict('keep_local')">내 변경사항 유지</button>
        <button onclick="resolveConflict('use_server')">서버 버전 사용</button>
        <button onclick="resolveConflict('manual_merge')">수동 병합</button>
      </div>
    </div>
  `;
  
  window.resolveConflict = (choice) => {
    let resolvedData;
    switch (choice) {
      case 'keep_local':
        resolvedData = localData;
        break;
      case 'use_server':
        resolvedData = serverData;
        break;
      case 'manual_merge':
        // 상세 병합 UI 표시 (생략)
        resolvedData = { ...serverData, ...localData }; // 임시 구현
        break;
    }
    
    document.body.removeChild(modal);
    delete window.resolveConflict;
    onResolve(resolvedData);
  };
  
  document.body.appendChild(modal);
}

// ========================================
// 11. 사용 예시
// ========================================

/*
// 견적서 작성 컴포넌트에서 사용
const QuoteEditor = ({ initialQuote }) => {
  const {
    data: quoteData,
    updateData,
    saveStatus,
    isAutoSaving,
    forceSave
  } = useAutoSave(
    initialQuote.id,
    initialQuote,
    (savedData, result) => {
      console.log('Quote auto-saved:', result);
    },
    {
      debounceMs: 2000,
      throttleMs: 30000,
      maxRetries: 3
    }
  );

  const handleFieldChange = (field, value) => {
    updateData({
      ...quoteData,
      [field]: value
    });
  };

  return (
    <div>
      <div className="save-status">
        {saveStatus === 'saved' && '✓ 저장됨'}
        {saveStatus === 'saving' && '💾 저장 중...'}
        {saveStatus === 'error' && '❌ 저장 실패'}
        {saveStatus === 'conflict' && '⚠️ 충돌 발생'}
      </div>
      
      <input 
        value={quoteData.projectTitle}
        onChange={(e) => handleFieldChange('projectTitle', e.target.value)}
      />
      
      <button onClick={forceSave}>수동 저장</button>
    </div>
  );
};
*/