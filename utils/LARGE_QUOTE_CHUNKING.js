// ========================================
// 대용량 견적서 청킹 및 분할 처리 시스템
// LARGE_QUOTE_CHUNKING.js
// ========================================

import { toast } from 'react-toastify';

// ========================================
// 1. 청킹 설정 및 상수
// ========================================

const CHUNK_CONFIG = {
  // JSON 크기 제한 (PostgreSQL JSONB 제한 고려)
  MAX_JSON_SIZE: 64 * 1024, // 64KB (안전 마진)
  MAX_ITEMS_PER_CHUNK: 50,    // 청크당 최대 아이템 수
  MAX_DETAILS_PER_CHUNK: 100, // 청크당 최대 상세 항목 수
  
  // 청킹 전략
  CHUNK_STRATEGY: {
    BY_SIZE: 'size',
    BY_COUNT: 'count', 
    BY_COMPLEXITY: 'complexity',
    ADAPTIVE: 'adaptive'
  },
  
  // 성능 임계값
  PERFORMANCE_THRESHOLDS: {
    PROCESSING_TIME: 5000, // 5초
    MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
    NETWORK_TIMEOUT: 30000 // 30초
  }
};

// ========================================
// 2. 견적서 크기 분석기
// ========================================

class QuoteAnalyzer {
  static analyzeQuoteSize(quoteData) {
    const analysis = {
      jsonSize: this.getJSONSize(quoteData),
      totalGroups: 0,
      totalItems: 0,
      totalDetails: 0,
      complexity: 0,
      estimatedProcessingTime: 0,
      needsChunking: false,
      chunkingStrategy: null
    };

    // 구조 분석
    if (quoteData.groups && Array.isArray(quoteData.groups)) {
      analysis.totalGroups = quoteData.groups.length;
      
      quoteData.groups.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          analysis.totalItems += group.items.length;
          
          group.items.forEach(item => {
            if (item.details && Array.isArray(item.details)) {
              analysis.totalDetails += item.details.length;
            }
          });
        }
      });
    }

    // 복잡도 계산
    analysis.complexity = this.calculateComplexity(analysis);
    
    // 처리 시간 예측 (경험적 공식)
    analysis.estimatedProcessingTime = this.estimateProcessingTime(analysis);
    
    // 청킹 필요성 판단
    analysis.needsChunking = this.needsChunking(analysis);
    
    // 청킹 전략 결정
    if (analysis.needsChunking) {
      analysis.chunkingStrategy = this.determineStrategy(analysis);
    }

    return analysis;
  }

  static getJSONSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (error) {
      // 폴백: 문자열 길이 기반 추정
      return JSON.stringify(data).length * 2; // UTF-16 가정
    }
  }

  static calculateComplexity(analysis) {
    // 가중치 기반 복잡도 계산
    return (
      analysis.totalGroups * 1 +
      analysis.totalItems * 2 +
      analysis.totalDetails * 3 +
      (analysis.jsonSize / 1024) * 0.1
    );
  }

  static estimateProcessingTime(analysis) {
    // 경험적 공식 (ms)
    return Math.max(
      100, // 최소 100ms
      analysis.complexity * 10 +
      analysis.jsonSize / 100
    );
  }

  static needsChunking(analysis) {
    return (
      analysis.jsonSize > CHUNK_CONFIG.MAX_JSON_SIZE ||
      analysis.totalDetails > CHUNK_CONFIG.MAX_DETAILS_PER_CHUNK ||
      analysis.estimatedProcessingTime > CHUNK_CONFIG.PERFORMANCE_THRESHOLDS.PROCESSING_TIME
    );
  }

  static determineStrategy(analysis) {
    if (analysis.jsonSize > CHUNK_CONFIG.MAX_JSON_SIZE) {
      return CHUNK_CONFIG.CHUNK_STRATEGY.BY_SIZE;
    } else if (analysis.totalDetails > CHUNK_CONFIG.MAX_DETAILS_PER_CHUNK) {
      return CHUNK_CONFIG.CHUNK_STRATEGY.BY_COUNT;
    } else {
      return CHUNK_CONFIG.CHUNK_STRATEGY.ADAPTIVE;
    }
  }
}

// ========================================
// 3. 청킹 엔진
// ========================================

class ChunkingEngine {
  static chunkQuote(quoteData, strategy = CHUNK_CONFIG.CHUNK_STRATEGY.ADAPTIVE) {
    const analysis = QuoteAnalyzer.analyzeQuoteSize(quoteData);
    
    if (!analysis.needsChunking) {
      return {
        chunks: [{ ...quoteData, chunkIndex: 0, totalChunks: 1 }],
        metadata: {
          originalSize: analysis.jsonSize,
          totalChunks: 1,
          strategy: 'none',
          analysis
        }
      };
    }

    console.log('🔄 대용량 견적서 청킹 시작:', analysis);
    
    let chunks = [];
    const actualStrategy = strategy === CHUNK_CONFIG.CHUNK_STRATEGY.ADAPTIVE ? 
      analysis.chunkingStrategy : strategy;

    switch (actualStrategy) {
      case CHUNK_CONFIG.CHUNK_STRATEGY.BY_SIZE:
        chunks = this.chunkBySize(quoteData);
        break;
      case CHUNK_CONFIG.CHUNK_STRATEGY.BY_COUNT:
        chunks = this.chunkByCount(quoteData);
        break;
      case CHUNK_CONFIG.CHUNK_STRATEGY.BY_COMPLEXITY:
        chunks = this.chunkByComplexity(quoteData);
        break;
      default:
        chunks = this.adaptiveChunking(quoteData);
    }

    return {
      chunks,
      metadata: {
        originalSize: analysis.jsonSize,
        totalChunks: chunks.length,
        strategy: actualStrategy,
        analysis
      }
    };
  }

  // 크기 기반 청킹
  static chunkBySize(quoteData) {
    const chunks = [];
    const targetChunkSize = CHUNK_CONFIG.MAX_JSON_SIZE * 0.8; // 20% 마진
    
    let currentChunk = {
      ...this.createBaseChunk(quoteData),
      groups: []
    };

    for (const group of quoteData.groups || []) {
      const groupCopy = { ...group, items: [] };
      
      for (const item of group.items || []) {
        const itemCopy = { ...item, details: [] };
        
        for (const detail of item.details || []) {
          itemCopy.details.push(detail);
          
          // 현재 청크 크기 확인
          const testChunk = {
            ...currentChunk,
            groups: [...currentChunk.groups, { ...groupCopy, items: [itemCopy] }]
          };
          
          if (QuoteAnalyzer.getJSONSize(testChunk) > targetChunkSize) {
            // 현재 청크 완료 및 새 청크 시작
            if (currentChunk.groups.length > 0) {
              chunks.push(currentChunk);
            }
            currentChunk = {
              ...this.createBaseChunk(quoteData),
              groups: [{ ...groupCopy, items: [itemCopy] }]
            };
          }
        }
        
        // 아이템을 현재 청크에 추가
        const existingGroup = currentChunk.groups.find(g => g.id === group.id);
        if (existingGroup) {
          existingGroup.items.push(itemCopy);
        } else {
          currentChunk.groups.push({ ...groupCopy, items: [itemCopy] });
        }
      }
    }

    // 마지막 청크 추가
    if (currentChunk.groups.length > 0) {
      chunks.push(currentChunk);
    }

    return this.finalizeChunks(chunks);
  }

  // 개수 기반 청킹
  static chunkByCount(quoteData) {
    const chunks = [];
    const maxDetailsPerChunk = CHUNK_CONFIG.MAX_DETAILS_PER_CHUNK;
    
    let currentChunk = {
      ...this.createBaseChunk(quoteData),
      groups: []
    };
    let currentDetailCount = 0;

    for (const group of quoteData.groups || []) {
      const groupCopy = { ...group, items: [] };
      
      for (const item of group.items || []) {
        const itemCopy = { ...item, details: [] };
        
        for (const detail of item.details || []) {
          if (currentDetailCount >= maxDetailsPerChunk) {
            // 현재 청크 완료
            if (currentChunk.groups.length > 0) {
              chunks.push(currentChunk);
            }
            currentChunk = {
              ...this.createBaseChunk(quoteData),
              groups: []
            };
            currentDetailCount = 0;
          }
          
          itemCopy.details.push(detail);
          currentDetailCount++;
        }
        
        // 아이템을 현재 청크에 추가
        const existingGroup = currentChunk.groups.find(g => g.id === group.id);
        if (existingGroup) {
          existingGroup.items.push(itemCopy);
        } else {
          currentChunk.groups.push({ ...groupCopy, items: [itemCopy] });
        }
      }
    }

    // 마지막 청크 추가
    if (currentChunk.groups.length > 0) {
      chunks.push(currentChunk);
    }

    return this.finalizeChunks(chunks);
  }

  // 복잡도 기반 청킹 (최신 알고리즘)
  static chunkByComplexity(quoteData) {
    const chunks = [];
    const maxComplexityPerChunk = 1000; // 복잡도 임계값
    
    let currentChunk = {
      ...this.createBaseChunk(quoteData),
      groups: []
    };
    let currentComplexity = 0;

    for (const group of quoteData.groups || []) {
      const groupComplexity = this.calculateGroupComplexity(group);
      
      if (currentComplexity + groupComplexity > maxComplexityPerChunk && currentChunk.groups.length > 0) {
        chunks.push(currentChunk);
        currentChunk = {
          ...this.createBaseChunk(quoteData),
          groups: []
        };
        currentComplexity = 0;
      }
      
      currentChunk.groups.push(group);
      currentComplexity += groupComplexity;
    }

    // 마지막 청크 추가
    if (currentChunk.groups.length > 0) {
      chunks.push(currentChunk);
    }

    return this.finalizeChunks(chunks);
  }

  // 적응형 청킹
  static adaptiveChunking(quoteData) {
    const analysis = QuoteAnalyzer.analyzeQuoteSize(quoteData);
    
    // 크기가 주 문제인 경우
    if (analysis.jsonSize > CHUNK_CONFIG.MAX_JSON_SIZE * 0.8) {
      return this.chunkBySize(quoteData);
    }
    // 개수가 주 문제인 경우
    else if (analysis.totalDetails > CHUNK_CONFIG.MAX_DETAILS_PER_CHUNK) {
      return this.chunkByCount(quoteData);
    }
    // 복잡도가 주 문제인 경우
    else {
      return this.chunkByComplexity(quoteData);
    }
  }

  // 헬퍼 메서드들
  static createBaseChunk(originalQuote) {
    const { groups, ...baseData } = originalQuote;
    return baseData;
  }

  static calculateGroupComplexity(group) {
    let complexity = 1; // 그룹 자체
    
    if (group.items) {
      complexity += group.items.length * 2; // 아이템들
      
      group.items.forEach(item => {
        if (item.details) {
          complexity += item.details.length * 3; // 세부사항들
        }
      });
    }
    
    return complexity;
  }

  static finalizeChunks(chunks) {
    return chunks.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
      totalChunks: chunks.length
    }));
  }
}

// ========================================
// 4. 병렬 처리 관리자
// ========================================

class ParallelProcessingManager {
  constructor() {
    this.activeProcesses = new Map();
    this.maxConcurrency = 3; // 동시 처리 개수 제한
    this.processQueue = [];
  }

  async processChunksInParallel(chunks, processor, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      progressCallback = null,
      errorCallback = null
    } = options;

    const results = new Array(chunks.length);
    const errors = new Array(chunks.length);
    let completed = 0;
    let failed = 0;

    const processChunk = async (chunk, index) => {
      const processId = `chunk_${index}_${Date.now()}`;
      this.activeProcesses.set(processId, {
        chunkIndex: index,
        startTime: Date.now(),
        retries: 0
      });

      let lastError = null;
      
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          const result = await this.executeWithTimeout(
            () => processor(chunk, index),
            CHUNK_CONFIG.PERFORMANCE_THRESHOLDS.NETWORK_TIMEOUT
          );
          
          results[index] = result;
          completed++;
          
          if (progressCallback) {
            progressCallback({
              completed: completed + failed,
              total: chunks.length,
              chunkIndex: index,
              success: true
            });
          }
          
          this.activeProcesses.delete(processId);
          return result;
          
        } catch (error) {
          lastError = error;
          console.warn(`청크 ${index} 처리 실패 (시도 ${retry + 1}/${maxRetries + 1}):`, error);
          
          if (retry < maxRetries) {
            await this.delay(retryDelay * Math.pow(2, retry)); // 지수 백오프
          }
        }
      }
      
      // 모든 재시도 실패
      errors[index] = lastError;
      failed++;
      
      if (errorCallback) {
        errorCallback({
          chunkIndex: index,
          error: lastError,
          chunk
        });
      }
      
      if (progressCallback) {
        progressCallback({
          completed: completed + failed,
          total: chunks.length,
          chunkIndex: index,
          success: false,
          error: lastError
        });
      }
      
      this.activeProcesses.delete(processId);
      throw lastError;
    };

    // 세마포어를 사용한 동시성 제어
    const semaphore = new Semaphore(this.maxConcurrency);
    
    const promises = chunks.map(async (chunk, index) => {
      await semaphore.acquire();
      try {
        return await processChunk(chunk, index);
      } finally {
        semaphore.release();
      }
    });

    const settled = await Promise.allSettled(promises);
    
    // 결과 정리
    const successfulResults = [];
    const failedChunks = [];
    
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push({
          index,
          chunk: chunks[index],
          result: result.value
        });
      } else {
        failedChunks.push({
          index,
          chunk: chunks[index],
          error: result.reason
        });
      }
    });

    return {
      results: successfulResults,
      errors: failedChunks,
      statistics: {
        total: chunks.length,
        successful: successfulResults.length,
        failed: failedChunks.length,
        successRate: (successfulResults.length / chunks.length) * 100
      }
    };
  }

  async executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`처리 시간 초과 (${timeout}ms)`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getActiveProcesses() {
    return Array.from(this.activeProcesses.entries()).map(([id, info]) => ({
      processId: id,
      ...info,
      duration: Date.now() - info.startTime
    }));
  }
}

// ========================================
// 5. 세마포어 클래스 (동시성 제어)
// ========================================

class Semaphore {
  constructor(permits) {
    this.permits = permits;
    this.waitQueue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release() {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next();
    } else {
      this.permits++;
    }
  }
}

// ========================================
// 6. 견적서 재조립기
// ========================================

class QuoteReassembler {
  static reassembleQuote(chunkResults, metadata) {
    console.log('🔧 견적서 청크 재조립 시작:', metadata);
    
    if (chunkResults.length === 1) {
      const { chunkIndex, totalChunks, ...quoteData } = chunkResults[0].result;
      return quoteData;
    }

    // 청크 결과 정렬
    const sortedResults = chunkResults.sort((a, b) => a.index - b.index);
    
    // 기본 견적서 데이터 (첫 번째 청크에서)
    const baseQuote = { ...sortedResults[0].result };
    delete baseQuote.chunkIndex;
    delete baseQuote.totalChunks;
    
    // 그룹들을 병합
    const mergedGroups = new Map();
    
    sortedResults.forEach(({ result }) => {
      if (result.groups) {
        result.groups.forEach(group => {
          if (mergedGroups.has(group.id)) {
            // 기존 그룹에 아이템 병합
            const existingGroup = mergedGroups.get(group.id);
            existingGroup.items = this.mergeItems(existingGroup.items, group.items);
          } else {
            // 새 그룹 추가
            mergedGroups.set(group.id, { ...group });
          }
        });
      }
    });
    
    baseQuote.groups = Array.from(mergedGroups.values());
    
    // 재조립 검증
    this.validateReassembly(baseQuote, metadata);
    
    console.log('✅ 견적서 재조립 완료');
    return baseQuote;
  }

  static mergeItems(existingItems = [], newItems = []) {
    const itemMap = new Map();
    
    // 기존 아이템들 추가
    existingItems.forEach(item => {
      itemMap.set(item.id, item);
    });
    
    // 새 아이템들 병합
    newItems.forEach(item => {
      if (itemMap.has(item.id)) {
        // 기존 아이템의 세부사항 병합
        const existingItem = itemMap.get(item.id);
        existingItem.details = this.mergeDetails(existingItem.details, item.details);
      } else {
        itemMap.set(item.id, item);
      }
    });
    
    return Array.from(itemMap.values());
  }

  static mergeDetails(existingDetails = [], newDetails = []) {
    const detailMap = new Map();
    
    existingDetails.forEach(detail => {
      detailMap.set(detail.id, detail);
    });
    
    newDetails.forEach(detail => {
      detailMap.set(detail.id, detail);
    });
    
    return Array.from(detailMap.values());
  }

  static validateReassembly(reassembledQuote, originalMetadata) {
    const newAnalysis = QuoteAnalyzer.analyzeQuoteSize(reassembledQuote);
    
    console.log('🔍 재조립 검증:', {
      원본크기: originalMetadata.analysis.jsonSize,
      재조립크기: newAnalysis.jsonSize,
      원본그룹수: originalMetadata.analysis.totalGroups,
      재조립그룹수: newAnalysis.totalGroups,
      원본아이템수: originalMetadata.analysis.totalItems,
      재조립아이템수: newAnalysis.totalItems,
      원본세부사항수: originalMetadata.analysis.totalDetails,
      재조립세부사항수: newAnalysis.totalDetails
    });
    
    // 기본 검증
    const tolerance = 0.05; // 5% 허용 오차
    if (Math.abs(newAnalysis.totalDetails - originalMetadata.analysis.totalDetails) > originalMetadata.analysis.totalDetails * tolerance) {
      console.warn('⚠️ 재조립된 견적서의 세부사항 수가 원본과 다릅니다.');
    }
  }
}

// ========================================
// 7. React Hook 통합
// ========================================

export const useLargeQuoteHandler = () => {
  const processingManagerRef = useRef(new ParallelProcessingManager());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(null);

  const handleLargeQuote = useCallback(async (quoteData, processor, options = {}) => {
    setIsProcessing(true);
    setProcessingProgress({ completed: 0, total: 0, stage: 'analyzing' });

    try {
      // 1. 크기 분석
      const analysis = QuoteAnalyzer.analyzeQuoteSize(quoteData);
      
      if (!analysis.needsChunking) {
        // 청킹이 필요없는 경우
        setProcessingProgress({ completed: 1, total: 1, stage: 'processing' });
        const result = await processor(quoteData, 0);
        setProcessingProgress({ completed: 1, total: 1, stage: 'complete' });
        return result;
      }

      // 2. 청킹
      setProcessingProgress({ completed: 0, total: 0, stage: 'chunking' });
      const { chunks, metadata } = ChunkingEngine.chunkQuote(quoteData);
      
      toast.info(`📦 대용량 견적서를 ${chunks.length}개 청크로 분할하여 처리합니다.`, {
        toastId: 'chunking-info'
      });

      // 3. 병렬 처리
      setProcessingProgress({ completed: 0, total: chunks.length, stage: 'processing' });
      
      const processingResult = await processingManagerRef.current.processChunksInParallel(
        chunks,
        processor,
        {
          ...options,
          progressCallback: (progress) => {
            setProcessingProgress({
              ...progress,
              stage: 'processing'
            });
          },
          errorCallback: (error) => {
            toast.error(`청크 ${error.chunkIndex} 처리 실패: ${error.error.message}`);
          }
        }
      );

      // 4. 재조립
      if (processingResult.errors.length > 0) {
        throw new Error(`${processingResult.errors.length}개 청크 처리 실패`);
      }

      setProcessingProgress({ 
        completed: chunks.length, 
        total: chunks.length, 
        stage: 'reassembling' 
      });

      const result = QuoteReassembler.reassembleQuote(processingResult.results, metadata);
      
      setProcessingProgress({ 
        completed: chunks.length, 
        total: chunks.length, 
        stage: 'complete' 
      });

      toast.success(`✅ 대용량 견적서 처리 완료 (${chunks.length}개 청크)`, {
        toastId: 'chunking-complete'
      });

      return result;

    } catch (error) {
      console.error('대용량 견적서 처리 실패:', error);
      toast.error(`❌ 견적서 처리 실패: ${error.message}`);
      throw error;
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(null), 3000);
    }
  }, []);

  const analyzeQuoteSize = useCallback((quoteData) => {
    return QuoteAnalyzer.analyzeQuoteSize(quoteData);
  }, []);

  return {
    handleLargeQuote,
    analyzeQuoteSize,
    isProcessing,
    processingProgress,
    activeProcesses: processingManagerRef.current.getActiveProcesses()
  };
};

// ========================================
// 8. 메인 API 인터페이스
// ========================================

export const LargeQuoteManager = {
  // 크기 분석
  analyze: QuoteAnalyzer.analyzeQuoteSize,
  
  // 청킹
  chunk: ChunkingEngine.chunkQuote,
  
  // 병렬 처리
  processInParallel: async (chunks, processor, options) => {
    const manager = new ParallelProcessingManager();
    return manager.processChunksInParallel(chunks, processor, options);
  },
  
  // 재조립
  reassemble: QuoteReassembler.reassembleQuote,
  
  // 통합 처리 함수
  handleLargeQuote: async (quoteData, processor, options = {}) => {
    const analysis = QuoteAnalyzer.analyzeQuoteSize(quoteData);
    
    if (!analysis.needsChunking) {
      return processor(quoteData, 0);
    }

    const { chunks, metadata } = ChunkingEngine.chunkQuote(quoteData);
    const manager = new ParallelProcessingManager();
    const result = await manager.processChunksInParallel(chunks, processor, options);
    
    if (result.errors.length > 0) {
      throw new Error(`${result.errors.length}개 청크 처리 실패`);
    }
    
    return QuoteReassembler.reassembleQuote(result.results, metadata);
  }
};

export default {
  LargeQuoteManager,
  useLargeQuoteHandler,
  QuoteAnalyzer,
  ChunkingEngine,
  ParallelProcessingManager,
  QuoteReassembler,
  CHUNK_CONFIG
};

// ========================================
// 9. 사용 예시
// ========================================

/*
// React 컴포넌트에서 사용
const QuoteProcessor = () => {
  const { handleLargeQuote, isProcessing, processingProgress } = useLargeQuoteHandler();

  const saveQuote = async (quoteData) => {
    try {
      const result = await handleLargeQuote(
        quoteData,
        async (chunk, index) => {
          // 각 청크를 서버에 저장
          const response = await fetch('/api/quotes/save-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chunk, chunkIndex: index })
          });
          return response.json();
        },
        {
          maxRetries: 3,
          retryDelay: 1000
        }
      );
      
      console.log('견적서 저장 완료:', result);
    } catch (error) {
      console.error('견적서 저장 실패:', error);
    }
  };

  return (
    <div>
      {isProcessing && processingProgress && (
        <div>
          <p>처리 단계: {processingProgress.stage}</p>
          <p>진행률: {processingProgress.completed}/{processingProgress.total}</p>
        </div>
      )}
      <button onClick={() => saveQuote(largeQuoteData)} disabled={isProcessing}>
        대용량 견적서 저장
      </button>
    </div>
  );
};

// 직접 API 사용
const directUsage = async () => {
  const analysis = LargeQuoteManager.analyze(quoteData);
  console.log('견적서 분석:', analysis);

  if (analysis.needsChunking) {
    const result = await LargeQuoteManager.handleLargeQuote(
      quoteData,
      async (chunk) => {
        return await saveChunkToServer(chunk);
      }
    );
    console.log('처리 결과:', result);
  }
};
*/