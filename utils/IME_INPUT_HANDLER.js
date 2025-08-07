// ========================================
// 한글 IME 입력 처리 및 자동저장 최적화
// IME_INPUT_HANDLER.js
// ========================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';

// ========================================
// 1. IME 상태 관리 클래스
// ========================================

class IMEStateManager {
  constructor() {
    this.compositionState = new Map(); // 요소별 IME 상태 관리
    this.lastCompositionValues = new Map(); // 마지막 조합 중인 값
    this.pendingSaves = new Map(); // 대기 중인 저장 작업
    this.compositionTimers = new Map(); // 조합 타이머
    this.defaultCompositionTimeout = 2000; // 2초 후 강제 완료
  }

  // 조합 시작
  startComposition(elementId, initialValue = '') {
    this.compositionState.set(elementId, {
      isComposing: true,
      startTime: Date.now(),
      initialValue,
      currentValue: initialValue,
      hasChanged: false
    });

    this.lastCompositionValues.set(elementId, initialValue);
    
    // 타임아웃 설정 (너무 오래 조합 상태인 경우 강제 완료)
    const timer = setTimeout(() => {
      this.forceEndComposition(elementId);
    }, this.defaultCompositionTimeout);
    
    this.compositionTimers.set(elementId, timer);
    
    console.log(`🇰🇷 IME 조합 시작: ${elementId}`);
  }

  // 조합 업데이트
  updateComposition(elementId, value, data = '') {
    const state = this.compositionState.get(elementId);
    if (!state) return false;

    state.currentValue = value;
    state.hasChanged = value !== state.initialValue;
    state.compositionData = data; // IME에서 제공하는 조합 데이터
    
    this.lastCompositionValues.set(elementId, value);
    
    return state.hasChanged;
  }

  // 조합 완료
  endComposition(elementId, finalValue = '') {
    const state = this.compositionState.get(elementId);
    if (!state) return null;

    // 타이머 정리
    const timer = this.compositionTimers.get(elementId);
    if (timer) {
      clearTimeout(timer);
      this.compositionTimers.delete(elementId);
    }

    const result = {
      elementId,
      finalValue,
      duration: Date.now() - state.startTime,
      hasChanged: finalValue !== state.initialValue,
      wasForced: false
    };

    // 상태 정리
    this.compositionState.delete(elementId);
    this.lastCompositionValues.delete(elementId);
    
    console.log(`🇰🇷 IME 조합 완료: ${elementId}`, result);
    
    return result;
  }

  // 강제 조합 완료 (타임아웃)
  forceEndComposition(elementId) {
    const state = this.compositionState.get(elementId);
    if (!state) return null;

    const lastValue = this.lastCompositionValues.get(elementId) || state.currentValue;
    const result = this.endComposition(elementId, lastValue);
    
    if (result) {
      result.wasForced = true;
      console.warn(`⚠️ IME 조합 강제 완료: ${elementId} (타임아웃)`);
    }
    
    return result;
  }

  // 현재 조합 상태 확인
  isComposing(elementId) {
    return this.compositionState.has(elementId) && this.compositionState.get(elementId).isComposing;
  }

  // 조합 중인 값 반환
  getComposingValue(elementId) {
    const state = this.compositionState.get(elementId);
    return state ? state.currentValue : null;
  }

  // 전체 상태 정리
  cleanup() {
    // 모든 타이머 정리
    this.compositionTimers.forEach(timer => clearTimeout(timer));
    
    // 상태 초기화
    this.compositionState.clear();
    this.lastCompositionValues.clear();
    this.pendingSaves.clear();
    this.compositionTimers.clear();
  }

  // 디버그 정보
  getDebugInfo() {
    return {
      activeCompositions: this.compositionState.size,
      pendingSaves: this.pendingSaves.size,
      activeTimers: this.compositionTimers.size
    };
  }
}

// 전역 IME 매니저 인스턴스
const imeManager = new IMEStateManager();

// ========================================
// 2. IME 이벤트 핸들러
// ========================================

class IMEEventHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.elementId = this.generateElementId(element);
    this.options = {
      autoSaveDelay: 1000, // IME 완료 후 1초 뒤 자동저장
      compositionDelay: 300, // 조합 완료 후 300ms 대기
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    };

    this.callbacks = {
      onCompositionStart: options.onCompositionStart || (() => {}),
      onCompositionUpdate: options.onCompositionUpdate || (() => {}),
      onCompositionEnd: options.onCompositionEnd || (() => {}),
      onValueChange: options.onValueChange || (() => {}),
      onAutoSave: options.onAutoSave || (() => {})
    };

    this.debouncedAutoSave = debounce(
      this.callbacks.onAutoSave, 
      this.options.autoSaveDelay
    );

    this.isAttached = false;
    this.lastValue = '';
  }

  // 이벤트 리스너 연결
  attach() {
    if (this.isAttached) return;

    this.element.addEventListener('compositionstart', this.handleCompositionStart.bind(this));
    this.element.addEventListener('compositionupdate', this.handleCompositionUpdate.bind(this));
    this.element.addEventListener('compositionend', this.handleCompositionEnd.bind(this));
    this.element.addEventListener('input', this.handleInput.bind(this));
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    this.isAttached = true;
    this.lastValue = this.element.value || '';
    
    if (this.options.enableLogging) {
      console.log(`🎯 IME 핸들러 연결: ${this.elementId}`);
    }
  }

  // 이벤트 리스너 해제
  detach() {
    if (!this.isAttached) return;

    this.element.removeEventListener('compositionstart', this.handleCompositionStart.bind(this));
    this.element.removeEventListener('compositionupdate', this.handleCompositionUpdate.bind(this));
    this.element.removeEventListener('compositionend', this.handleCompositionEnd.bind(this));
    this.element.removeEventListener('input', this.handleInput.bind(this));
    this.element.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 진행 중인 조합 강제 완료
    if (imeManager.isComposing(this.elementId)) {
      imeManager.forceEndComposition(this.elementId);
    }
    
    this.debouncedAutoSave.cancel();
    this.isAttached = false;
    
    if (this.options.enableLogging) {
      console.log(`🎯 IME 핸들러 해제: ${this.elementId}`);
    }
  }

  // 조합 시작 처리
  handleCompositionStart(event) {
    const currentValue = this.element.value || '';
    imeManager.startComposition(this.elementId, currentValue);
    
    // 진행 중인 자동저장 취소
    this.debouncedAutoSave.cancel();
    
    this.callbacks.onCompositionStart({
      elementId: this.elementId,
      initialValue: currentValue,
      event
    });
    
    if (this.options.enableLogging) {
      console.log(`🇰🇷 조합 시작: "${currentValue}"`);
    }
  }

  // 조합 업데이트 처리
  handleCompositionUpdate(event) {
    const currentValue = this.element.value || '';
    const compositionData = event.data || '';
    
    const hasChanged = imeManager.updateComposition(
      this.elementId, 
      currentValue, 
      compositionData
    );
    
    this.callbacks.onCompositionUpdate({
      elementId: this.elementId,
      currentValue,
      compositionData,
      hasChanged,
      event
    });
    
    if (this.options.enableLogging) {
      console.log(`🇰🇷 조합 업데이트: "${currentValue}" (data: "${compositionData}")`);
    }
  }

  // 조합 완료 처리
  handleCompositionEnd(event) {
    const finalValue = this.element.value || '';
    const result = imeManager.endComposition(this.elementId, finalValue);
    
    if (!result) return;
    
    this.lastValue = finalValue;
    
    // 조합이 완료된 후 잠시 대기 후 자동저장 시작
    setTimeout(() => {
      if (!imeManager.isComposing(this.elementId)) {
        this.triggerAutoSave();
      }
    }, this.options.compositionDelay);
    
    this.callbacks.onCompositionEnd({
      elementId: this.elementId,
      finalValue,
      result,
      event
    });
    
    if (this.options.enableLogging) {
      console.log(`🇰🇷 조합 완료: "${finalValue}" (${result.duration}ms)`);
    }
  }

  // 입력 처리 (IME가 아닌 일반 입력)
  handleInput(event) {
    const currentValue = this.element.value || '';
    
    // IME 조합 중이면 자동저장하지 않음
    if (imeManager.isComposing(this.elementId)) {
      return;
    }
    
    // 값이 실제로 변경된 경우에만 처리
    if (currentValue !== this.lastValue) {
      this.lastValue = currentValue;
      
      this.callbacks.onValueChange({
        elementId: this.elementId,
        value: currentValue,
        previousValue: this.lastValue,
        event
      });
      
      this.triggerAutoSave();
    }
  }

  // 키 입력 처리 (특수키 감지)
  handleKeyDown(event) {
    // ESC 키로 IME 조합 강제 취소
    if (event.key === 'Escape' && imeManager.isComposing(this.elementId)) {
      event.preventDefault();
      imeManager.forceEndComposition(this.elementId);
      
      if (this.options.enableLogging) {
        console.log('🇰🇷 IME 조합 ESC로 강제 취소');
      }
    }
    
    // Enter 키로 IME 조합 강제 완료
    if (event.key === 'Enter' && imeManager.isComposing(this.elementId)) {
      // IME 조합 중인 Enter는 조합 완료용이므로 자동저장 트리거하지 않음
      setTimeout(() => {
        if (!imeManager.isComposing(this.elementId)) {
          this.triggerAutoSave();
        }
      }, 100);
    }
  }

  // 자동저장 트리거
  triggerAutoSave() {
    const currentValue = this.element.value || '';
    
    if (this.options.enableLogging) {
      console.log(`💾 자동저장 예약: "${currentValue}"`);
    }
    
    this.debouncedAutoSave(currentValue, {
      elementId: this.elementId,
      timestamp: Date.now()
    });
  }

  // 요소 ID 생성
  generateElementId(element) {
    return element.id || 
           element.name || 
           element.dataset?.imeId ||
           `ime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 현재 상태 확인
  getState() {
    return {
      elementId: this.elementId,
      isAttached: this.isAttached,
      isComposing: imeManager.isComposing(this.elementId),
      lastValue: this.lastValue,
      currentValue: this.element.value || ''
    };
  }
}

// ========================================
// 3. React Hook - useIMEHandler
// ========================================

export const useIMEHandler = (options = {}) => {
  const elementRef = useRef(null);
  const handlerRef = useRef(null);
  const [imeState, setIMEState] = useState({
    isComposing: false,
    composingValue: '',
    lastSavedValue: ''
  });

  // IME 이벤트 콜백들
  const callbacks = {
    onCompositionStart: useCallback((data) => {
      setIMEState(prev => ({
        ...prev,
        isComposing: true,
        composingValue: data.initialValue
      }));
      
      options.onCompositionStart?.(data);
    }, [options.onCompositionStart]),

    onCompositionUpdate: useCallback((data) => {
      setIMEState(prev => ({
        ...prev,
        composingValue: data.currentValue
      }));
      
      options.onCompositionUpdate?.(data);
    }, [options.onCompositionUpdate]),

    onCompositionEnd: useCallback((data) => {
      setIMEState(prev => ({
        ...prev,
        isComposing: false,
        composingValue: data.finalValue
      }));
      
      options.onCompositionEnd?.(data);
    }, [options.onCompositionEnd]),

    onValueChange: useCallback((data) => {
      options.onValueChange?.(data);
    }, [options.onValueChange]),

    onAutoSave: useCallback((value, metadata) => {
      setIMEState(prev => ({
        ...prev,
        lastSavedValue: value
      }));
      
      options.onAutoSave?.(value, metadata);
    }, [options.onAutoSave])
  };

  // 핸들러 초기화
  useEffect(() => {
    if (!elementRef.current) return;

    handlerRef.current = new IMEEventHandler(elementRef.current, {
      ...options,
      ...callbacks
    });
    
    handlerRef.current.attach();

    return () => {
      if (handlerRef.current) {
        handlerRef.current.detach();
        handlerRef.current = null;
      }
    };
  }, [elementRef.current, options.autoSaveDelay, options.compositionDelay]);

  // 수동 자동저장 트리거
  const triggerSave = useCallback(() => {
    if (handlerRef.current && !imeState.isComposing) {
      handlerRef.current.triggerAutoSave();
    }
  }, [imeState.isComposing]);

  // IME 상태 강제 리셋
  const resetIMEState = useCallback(() => {
    if (handlerRef.current && imeState.isComposing) {
      imeManager.forceEndComposition(handlerRef.current.elementId);
      setIMEState(prev => ({
        ...prev,
        isComposing: false
      }));
    }
  }, [imeState.isComposing]);

  return {
    elementRef,
    imeState,
    triggerSave,
    resetIMEState,
    isComposing: imeState.isComposing
  };
};

// ========================================
// 4. React Hook - useIMEOptimizedInput
// ========================================

export const useIMEOptimizedInput = (initialValue = '', options = {}) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  
  const {
    elementRef,
    imeState,
    triggerSave,
    resetIMEState
  } = useIMEHandler({
    ...options,
    onValueChange: (data) => {
      setValue(data.value);
      options.onValueChange?.(data);
    },
    onAutoSave: (savedValue, metadata) => {
      setDebouncedValue(savedValue);
      options.onAutoSave?.(savedValue, metadata);
    }
  });

  // 입력값 수동 설정
  const handleSetValue = useCallback((newValue) => {
    if (elementRef.current) {
      elementRef.current.value = newValue;
      setValue(newValue);
      
      // IME 조합 중이 아닐 때만 자동저장 트리거
      if (!imeState.isComposing) {
        triggerSave();
      }
    }
  }, [elementRef, imeState.isComposing, triggerSave]);

  // 강제 저장
  const forceSave = useCallback(() => {
    resetIMEState(); // IME 상태 리셋
    triggerSave();   // 저장 트리거
  }, [resetIMEState, triggerSave]);

  return {
    elementRef,
    value,
    debouncedValue, // 실제 저장된 값
    setValue: handleSetValue,
    forceSave,
    imeState: {
      ...imeState,
      hasUnsavedChanges: value !== debouncedValue
    }
  };
};

// ========================================
// 5. 고급 IME 유틸리티
// ========================================

export const IMEUtils = {
  // IME 지원 여부 확인
  isIMESupported() {
    return 'CompositionEvent' in window;
  },

  // 현재 IME 언어 감지
  detectIMELanguage(compositionData) {
    if (!compositionData) return 'unknown';
    
    // 한글 감지
    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(compositionData)) {
      return 'ko';
    }
    
    // 일본어 감지
    if (/[ひらがなカタカナ]/.test(compositionData)) {
      return 'ja';
    }
    
    // 중국어 간체 감지
    if (/[\u4e00-\u9fff]/.test(compositionData)) {
      return 'zh';
    }
    
    return 'unknown';
  },

  // IME 상태 전역 확인
  getGlobalIMEState() {
    return imeManager.getDebugInfo();
  },

  // 전역 IME 정리
  cleanupGlobalIME() {
    imeManager.cleanup();
  },

  // IME 관련 CSS 클래스 토글
  toggleIMEClass(element, isComposing) {
    if (!element) return;
    
    if (isComposing) {
      element.classList.add('ime-composing');
      element.classList.remove('ime-idle');
    } else {
      element.classList.remove('ime-composing');
      element.classList.add('ime-idle');
    }
  },

  // IME 조합 상태 시각적 표시
  showIMEIndicator(element, show = true) {
    if (!element) return;
    
    let indicator = element.parentElement?.querySelector('.ime-indicator');
    
    if (show && !indicator) {
      indicator = document.createElement('div');
      indicator.className = 'ime-indicator';
      indicator.textContent = '한글';
      indicator.style.cssText = `
        position: absolute;
        top: -20px;
        right: 0;
        background: #2196F3;
        color: white;
        padding: 2px 6px;
        font-size: 10px;
        border-radius: 3px;
        pointer-events: none;
        z-index: 1000;
      `;
      
      if (element.parentElement) {
        element.parentElement.style.position = 'relative';
        element.parentElement.appendChild(indicator);
      }
    } else if (!show && indicator) {
      indicator.remove();
    }
  }
};

// ========================================
// 6. 개발 도구 (Development Only)
// ========================================

if (process.env.NODE_ENV === 'development') {
  // 글로벌 디버그 함수들
  window.IMEDebug = {
    manager: imeManager,
    utils: IMEUtils,
    
    // 활성 IME 상태 로깅
    logActiveIME() {
      console.log('🔍 활성 IME 상태:', imeManager.getDebugInfo());
    },
    
    // 모든 IME 강제 완료
    forceEndAllIME() {
      console.log('🚨 모든 IME 조합 강제 완료');
      imeManager.cleanup();
    }
  };
}

// ========================================
// 7. 자동 정리 (페이지 언로드 시)
// ========================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imeManager.cleanup();
  });
  
  window.addEventListener('pagehide', () => {
    imeManager.cleanup();
  });
}

export default {
  useIMEHandler,
  useIMEOptimizedInput,
  IMEUtils,
  IMEStateManager,
  IMEEventHandler
};

// ========================================
// 8. 사용 예시
// ========================================

/*
// 기본 IME 핸들러 사용
const BasicIMEInput = () => {
  const { elementRef, imeState } = useIMEHandler({
    autoSaveDelay: 2000,
    onAutoSave: (value) => {
      console.log('자동저장:', value);
      // 서버에 저장 로직
    },
    onCompositionStart: () => {
      console.log('한글 입력 시작');
    }
  });

  return (
    <div>
      <input 
        ref={elementRef}
        placeholder="한글 입력 테스트"
        style={{ 
          borderColor: imeState.isComposing ? '#2196F3' : '#ddd'
        }}
      />
      {imeState.isComposing && <span>✏️ 한글 입력 중...</span>}
    </div>
  );
};

// 고급 IME 최적화 입력 사용
const OptimizedIMEInput = () => {
  const {
    elementRef,
    value,
    debouncedValue,
    setValue,
    forceSave,
    imeState
  } = useIMEOptimizedInput('', {
    autoSaveDelay: 1000,
    onAutoSave: (value) => {
      // 자동저장 로직
      saveToServer(value);
    }
  });

  return (
    <div>
      <textarea
        ref={elementRef}
        placeholder="최적화된 한글 입력"
        rows={4}
      />
      <div>
        <p>현재 값: {value}</p>
        <p>저장된 값: {debouncedValue}</p>
        <p>상태: {imeState.isComposing ? '입력 중' : '대기'}</p>
        <p>미저장 변경: {imeState.hasUnsavedChanges ? '있음' : '없음'}</p>
        <button onClick={forceSave} disabled={imeState.isComposing}>
          강제 저장
        </button>
      </div>
    </div>
  );
};
*/