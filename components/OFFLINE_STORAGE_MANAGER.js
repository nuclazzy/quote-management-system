// ========================================
// 오프라인 저장 및 네트워크 복구 시스템
// OFFLINE_STORAGE_MANAGER.js
// ========================================

import { openDB } from 'idb';
import { toast } from 'react-toastify';

// ========================================
// 1. IndexedDB 초기화 및 관리
// ========================================

class OfflineStorageManager {
  constructor() {
    this.dbName = 'QuoteSystemOffline';
    this.version = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.maxRetries = 5;
    this.retryDelay = 1000; // 1초
    
    this.init();
    this.setupNetworkListeners();
  }

  async init() {
    try {
      this.db = await openDB(this.dbName, this.version, {
        upgrade(db) {
          // 오프라인 견적서 저장소
          if (!db.objectStoreNames.contains('quotes')) {
            const quoteStore = db.createObjectStore('quotes', { keyPath: 'id' });
            quoteStore.createIndex('status', 'status');
            quoteStore.createIndex('timestamp', 'timestamp');
            quoteStore.createIndex('syncStatus', 'syncStatus');
          }
          
          // 동기화 큐
          if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
            syncStore.createIndex('priority', 'priority');
            syncStore.createIndex('timestamp', 'timestamp');
            syncStore.createIndex('retryCount', 'retryCount');
          }
          
          // 오프라인 액션 큐
          if (!db.objectStoreNames.contains('actionQueue')) {
            const actionStore = db.createObjectStore('actionQueue', { keyPath: 'id' });
            actionStore.createIndex('type', 'type');
            actionStore.createIndex('timestamp', 'timestamp');
          }
          
          // 네트워크 상태 로그
          if (!db.objectStoreNames.contains('networkLog')) {
            const logStore = db.createObjectStore('networkLog', { keyPath: 'id' });
            logStore.createIndex('timestamp', 'timestamp');
            logStore.createIndex('type', 'type');
          }
        }
      });
      
      console.log('📱 Offline storage initialized');
      
      // 앱 시작 시 동기화 큐 처리
      if (this.isOnline) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('❌ Failed to initialize offline storage:', error);
    }
  }

  // ========================================
  // 2. 네트워크 상태 모니터링
  // ========================================

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.logNetworkEvent('online');
      toast.success('🌐 네트워크가 복구되었습니다. 동기화를 시작합니다.', {
        toastId: 'network-online'
      });
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.logNetworkEvent('offline');
      toast.warning('📱 오프라인 모드로 전환되었습니다. 변경사항은 로컬에 저장됩니다.', {
        toastId: 'network-offline',
        autoClose: false
      });
    });
    
    // 주기적 연결 상태 확인
    setInterval(() => {
      this.checkNetworkHealth();
    }, 30000); // 30초마다
  }

  async checkNetworkHealth() {
    try {
      // 실제 API 엔드포인트로 헬스체크
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (wasOnline !== this.isOnline) {
        if (this.isOnline) {
          this.logNetworkEvent('recovered');
          this.processSyncQueue();
        } else {
          this.logNetworkEvent('degraded');
        }
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.logNetworkEvent('failed');
      }
    }
  }

  // ========================================
  // 3. 오프라인 견적서 저장
  // ========================================

  async saveQuoteOffline(quoteData, action = 'update') {
    if (!this.db) return false;

    try {
      const offlineQuote = {
        ...quoteData,
        syncStatus: 'pending',
        lastModified: Date.now(),
        offlineAction: action,
        timestamp: Date.now()
      };

      await this.db.put('quotes', offlineQuote);
      
      // 동기화 큐에 추가
      await this.addToSyncQueue({
        type: 'quote_save',
        quoteId: quoteData.id,
        action,
        data: quoteData,
        priority: action === 'create' ? 1 : 2
      });

      console.log(`💾 Quote saved offline: ${quoteData.id}`);
      
      toast.info('💾 변경사항이 로컬에 저장되었습니다', {
        toastId: `offline-save-${quoteData.id}`,
        autoClose: 3000
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save quote offline:', error);
      return false;
    }
  }

  // ========================================
  // 4. 동기화 큐 관리
  // ========================================

  async addToSyncQueue(item) {
    if (!this.db) return;

    const syncItem = {
      id: `${item.type}_${item.quoteId}_${Date.now()}`,
      ...item,
      timestamp: Date.now(),
      retryCount: 0,
      lastAttempt: null,
      status: 'pending'
    };

    await this.db.put('syncQueue', syncItem);
  }

  async processSyncQueue() {
    if (!this.db || !this.isOnline) return;

    try {
      const tx = this.db.transaction('syncQueue', 'readonly');
      const syncItems = await tx.store.getAll();
      
      const pendingItems = syncItems
        .filter(item => item.status === 'pending' || item.status === 'failed')
        .sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp);

      console.log(`🔄 Processing ${pendingItems.length} sync items`);

      for (const item of pendingItems) {
        await this.processSyncItem(item);
        
        // 배치 간 짧은 지연 (서버 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 성공한 항목들 정리
      await this.cleanupCompletedSyncItems();
      
    } catch (error) {
      console.error('❌ Sync queue processing failed:', error);
    }
  }

  async processSyncItem(item) {
    if (item.retryCount >= this.maxRetries) {
      console.warn(`⚠️ Max retries exceeded for item: ${item.id}`);
      await this.markSyncItemFailed(item.id);
      return;
    }

    try {
      await this.updateSyncItemStatus(item.id, 'processing');

      let success = false;
      
      switch (item.type) {
        case 'quote_save':
          success = await this.syncQuoteToServer(item);
          break;
        case 'quote_delete':
          success = await this.syncQuoteDelete(item);
          break;
        default:
          console.warn(`Unknown sync type: ${item.type}`);
      }

      if (success) {
        await this.markSyncItemCompleted(item.id);
        console.log(`✅ Sync completed: ${item.id}`);
      } else {
        throw new Error('Sync operation returned false');
      }
      
    } catch (error) {
      console.error(`❌ Sync failed for item ${item.id}:`, error);
      await this.handleSyncFailure(item, error);
    }
  }

  // ========================================
  // 5. 서버 동기화 작업
  // ========================================

  async syncQuoteToServer(syncItem) {
    try {
      const response = await fetch(`/api/quotes/${syncItem.quoteId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: syncItem.data,
          action: syncItem.action,
          offlineTimestamp: syncItem.timestamp,
          conflictResolution: 'client_wins' // 클라이언트 우선
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // 로컬 견적서 상태 업데이트
        await this.updateLocalQuoteStatus(syncItem.quoteId, 'synced', result);
        
        return true;
      } else if (response.status === 409) {
        // 충돌 발생 - 사용자 개입 필요
        const conflictData = await response.json();
        await this.handleSyncConflict(syncItem, conflictData);
        return false;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // 네트워크 오류
        this.isOnline = false;
        return false;
      }
      throw error;
    }
  }

  // ========================================
  // 6. 충돌 해결 시스템
  // ========================================

  async handleSyncConflict(syncItem, conflictData) {
    const conflictId = `conflict_${syncItem.quoteId}_${Date.now()}`;
    
    // 충돌 정보 저장
    await this.db.put('actionQueue', {
      id: conflictId,
      type: 'conflict_resolution',
      syncItemId: syncItem.id,
      localData: syncItem.data,
      serverData: conflictData.serverData,
      conflictFields: conflictData.conflictFields,
      timestamp: Date.now(),
      status: 'pending_user_input'
    });

    // 사용자에게 알림
    toast.error('⚠️ 동기화 충돌이 발생했습니다. 해결이 필요합니다.', {
      toastId: conflictId,
      autoClose: false,
      onClick: () => this.showConflictResolutionModal(conflictId)
    });
  }

  async resolveConflict(conflictId, resolution, mergedData = null) {
    try {
      const conflict = await this.db.get('actionQueue', conflictId);
      if (!conflict) return false;

      let finalData;
      switch (resolution) {
        case 'keep_local':
          finalData = conflict.localData;
          break;
        case 'use_server':
          finalData = conflict.serverData;
          break;
        case 'merge':
          finalData = mergedData || this.autoMergeConflict(conflict);
          break;
        default:
          throw new Error(`Unknown resolution: ${resolution}`);
      }

      // 해결된 데이터로 재시도
      await this.addToSyncQueue({
        type: 'quote_save',
        quoteId: conflict.localData.id,
        action: 'update',
        data: finalData,
        priority: 1 // 높은 우선순위
      });

      // 충돌 아이템 완료 처리
      await this.db.delete('actionQueue', conflictId);
      
      toast.success('✅ 충돌이 해결되었습니다', {
        toastId: `resolved_${conflictId}`
      });

      return true;
    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
      return false;
    }
  }

  // ========================================
  // 7. 자동 병합 로직
  // ========================================

  autoMergeConflict(conflict) {
    const local = conflict.localData;
    const server = conflict.serverData;
    
    // 타임스탬프 기반 병합
    const merged = { ...server };
    
    // 최신 변경사항 우선 적용
    const localTime = new Date(local.updatedAt || local.lastModified);
    const serverTime = new Date(server.updatedAt);
    
    if (localTime > serverTime) {
      // 로컬이 더 최신인 필드들 적용
      const priorityFields = [
        'projectTitle', 'notes', 'status'
      ];
      
      priorityFields.forEach(field => {
        if (local[field] !== server[field]) {
          merged[field] = local[field];
        }
      });
    }
    
    // 구조적 변경은 서버 우선 (안전성)
    if (JSON.stringify(local.groups) !== JSON.stringify(server.groups)) {
      merged.groups = server.groups;
      merged._conflictNote = '구조 변경사항은 서버 버전을 사용했습니다.';
    }
    
    return merged;
  }

  // ========================================
  // 8. 상태 관리 헬퍼 함수들
  // ========================================

  async updateSyncItemStatus(itemId, status) {
    const item = await this.db.get('syncQueue', itemId);
    if (item) {
      item.status = status;
      item.lastAttempt = Date.now();
      await this.db.put('syncQueue', item);
    }
  }

  async markSyncItemCompleted(itemId) {
    const item = await this.db.get('syncQueue', itemId);
    if (item) {
      item.status = 'completed';
      item.completedAt = Date.now();
      await this.db.put('syncQueue', item);
    }
  }

  async markSyncItemFailed(itemId) {
    const item = await this.db.get('syncQueue', itemId);
    if (item) {
      item.status = 'failed';
      item.failedAt = Date.now();
      await this.db.put('syncQueue', item);
    }
  }

  async handleSyncFailure(item, error) {
    const updatedItem = {
      ...item,
      retryCount: item.retryCount + 1,
      lastError: error.message,
      status: 'failed'
    };
    
    await this.db.put('syncQueue', updatedItem);
    
    // 지수 백오프로 재시도 예약
    const delay = this.retryDelay * Math.pow(2, item.retryCount);
    setTimeout(() => {
      if (this.isOnline && updatedItem.retryCount < this.maxRetries) {
        this.processSyncItem(updatedItem);
      }
    }, delay);
  }

  // ========================================
  // 9. 로컬 데이터 관리
  // ========================================

  async getOfflineQuotes() {
    if (!this.db) return [];
    
    const tx = this.db.transaction('quotes', 'readonly');
    return await tx.store.getAll();
  }

  async getQuoteById(quoteId) {
    if (!this.db) return null;
    
    return await this.db.get('quotes', quoteId);
  }

  async updateLocalQuoteStatus(quoteId, status, serverData = null) {
    if (!this.db) return;
    
    const quote = await this.db.get('quotes', quoteId);
    if (quote) {
      quote.syncStatus = status;
      quote.lastSynced = Date.now();
      
      if (serverData) {
        // 서버 데이터로 업데이트 (버전 등)
        Object.assign(quote, serverData);
      }
      
      await this.db.put('quotes', quote);
    }
  }

  // ========================================
  // 10. 정리 및 유지보수
  // ========================================

  async cleanupCompletedSyncItems() {
    if (!this.db) return;
    
    const tx = this.db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const items = await store.getAll();
    
    // 24시간 이상 된 완료 항목 삭제
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const item of items) {
      if (item.status === 'completed' && item.completedAt < cutoff) {
        await store.delete(item.id);
      }
    }
  }

  async logNetworkEvent(type, details = {}) {
    if (!this.db) return;
    
    await this.db.put('networkLog', {
      id: `${type}_${Date.now()}`,
      type,
      timestamp: Date.now(),
      details,
      userAgent: navigator.userAgent
    });
  }

  // ========================================
  // 11. 통계 및 모니터링
  // ========================================

  async getStorageStats() {
    if (!this.db) return null;
    
    const [quotes, syncQueue, actionQueue, networkLog] = await Promise.all([
      this.db.count('quotes'),
      this.db.count('syncQueue'),
      this.db.count('actionQueue'),
      this.db.count('networkLog')
    ]);
    
    return {
      quotes,
      syncQueue,
      actionQueue,
      networkLog,
      isOnline: this.isOnline,
      lastSync: await this.getLastSyncTime()
    };
  }

  async getLastSyncTime() {
    if (!this.db) return null;
    
    const tx = this.db.transaction('quotes', 'readonly');
    const index = tx.store.index('timestamp');
    const quotes = await index.getAll();
    
    const synced = quotes.filter(q => q.syncStatus === 'synced');
    if (synced.length === 0) return null;
    
    return Math.max(...synced.map(q => q.lastSynced || 0));
  }
}

// ========================================
// 12. 싱글톤 인스턴스 및 React Hook
// ========================================

const offlineManager = new OfflineStorageManager();

export const useOfflineStorage = () => {
  const [stats, setStats] = React.useState(null);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    const updateStats = async () => {
      const currentStats = await offlineManager.getStorageStats();
      setStats(currentStats);
      setIsOnline(currentStats?.isOnline || navigator.onLine);
    };
    
    updateStats();
    const interval = setInterval(updateStats, 10000); // 10초마다 업데이트
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    offlineManager,
    stats,
    isOnline,
    saveOffline: (data, action) => offlineManager.saveQuoteOffline(data, action),
    resolveConflict: (conflictId, resolution, data) => 
      offlineManager.resolveConflict(conflictId, resolution, data),
    getOfflineQuotes: () => offlineManager.getOfflineQuotes()
  };
};

export default offlineManager;

// ========================================
// 13. 사용 예시
// ========================================

/*
// 컴포넌트에서 사용
const QuoteEditor = () => {
  const { offlineManager, isOnline, saveOffline } = useOfflineStorage();
  
  const handleSave = async (quoteData) => {
    if (isOnline) {
      try {
        await saveToServer(quoteData);
      } catch (error) {
        // 서버 저장 실패 시 오프라인 저장
        await saveOffline(quoteData, 'update');
      }
    } else {
      // 오프라인 상태 시 로컬 저장
      await saveOffline(quoteData, 'update');
    }
  };
  
  return (
    <div>
      <div className="network-status">
        {isOnline ? '🌐 온라인' : '📱 오프라인'}
      </div>
      {/* 견적서 편집 UI */}
    </div>
  );
};
*/