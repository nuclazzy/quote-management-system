// API 성능 모니터링 유틸리티
export class ApiPerformanceMonitor {
  private static instance: ApiPerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): ApiPerformanceMonitor {
    if (!ApiPerformanceMonitor.instance) {
      ApiPerformanceMonitor.instance = new ApiPerformanceMonitor();
    }
    return ApiPerformanceMonitor.instance;
  }

  recordMetric(endpoint: string, duration: number) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const durations = this.metrics.get(endpoint)!;
    durations.push(duration);
    
    // 최대 100개 기록 유지
    if (durations.length > 100) {
      durations.shift();
    }
  }

  getStats(endpoint: string) {
    const durations = this.metrics.get(endpoint);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = durations.slice().sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      count: durations.length,
      average: Math.round(avg * 100) / 100,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const endpoint of this.metrics.keys()) {
      stats[endpoint] = this.getStats(endpoint);
    }
    return stats;
  }
}