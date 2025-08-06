import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../format'

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('should format number as Korean currency', () => {
      expect(formatCurrency(1000000)).toBe('₩1,000,000')
      expect(formatCurrency(500)).toBe('₩500')
      expect(formatCurrency(1234567.89)).toBe('₩1,234,568') // 소수점 반올림
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('₩0')
    })

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1000)).toBe('-₩1,000')
    })

    it('should handle null and undefined', () => {
      expect(formatCurrency(null as any)).toBe('₩0')
      expect(formatCurrency(undefined as any)).toBe('₩0')
    })

    it('should handle NaN', () => {
      expect(formatCurrency(NaN)).toBe('₩0')
    })
  })

  describe('formatDate', () => {
    it('should format date string to Korean date format', () => {
      expect(formatDate('2024-01-15')).toBe('2024년 1월 15일')
      expect(formatDate('2024-12-31')).toBe('2024년 12월 31일')
    })

    it('should format Date object', () => {
      const date = new Date('2024-06-15')
      expect(formatDate(date)).toBe('2024년 6월 15일')
    })

    it('should format ISO date string', () => {
      expect(formatDate('2024-03-25T10:30:00Z')).toBe('2024년 3월 25일')
    })

    it('should handle invalid date', () => {
      expect(formatDate('invalid-date')).toBe('잘못된 날짜')
      expect(formatDate('')).toBe('잘못된 날짜')
    })

    it('should handle null and undefined', () => {
      expect(formatDate(null as any)).toBe('잘못된 날짜')
      expect(formatDate(undefined as any)).toBe('잘못된 날짜')
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time in Korean format', () => {
      const date = new Date('2024-01-15T14:30:00')
      expect(formatDateTime(date)).toMatch(/2024년 1월 15일/)
      expect(formatDateTime(date)).toMatch(/오후 2:30/)
    })

    it('should format morning time correctly', () => {
      const date = new Date('2024-01-15T09:15:00')
      expect(formatDateTime(date)).toMatch(/오전 9:15/)
    })

    it('should format midnight correctly', () => {
      const date = new Date('2024-01-15T00:00:00')
      expect(formatDateTime(date)).toMatch(/오전 12:00/)
    })

    it('should format noon correctly', () => {
      const date = new Date('2024-01-15T12:00:00')
      expect(formatDateTime(date)).toMatch(/오후 12:00/)
    })

    it('should handle invalid date', () => {
      expect(formatDateTime('invalid')).toBe('잘못된 날짜')
    })
  })

  describe('formatNumber', () => {
    it('should format number with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(123456789)).toBe('123,456,789')
    })

    it('should handle decimal numbers', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56')
      expect(formatNumber(0.123)).toBe('0.123')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000')
      expect(formatNumber(-1234.56)).toBe('-1,234.56')
    })

    it('should handle null and undefined', () => {
      expect(formatNumber(null as any)).toBe('0')
      expect(formatNumber(undefined as any)).toBe('0')
    })

    it('should handle NaN', () => {
      expect(formatNumber(NaN)).toBe('0')
    })

    it('should handle very large numbers', () => {
      expect(formatNumber(9999999999999)).toBe('9,999,999,999,999')
    })

    it('should handle very small decimal numbers', () => {
      expect(formatNumber(0.000001)).toBe('0.000001')
    })
  })
})