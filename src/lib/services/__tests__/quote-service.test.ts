import { QuoteService } from '../quote-service'
import { createBrowserClient } from '@/lib/supabase/client'
import { createSupabaseResponse } from '@/utils/test-utils'

// Supabase 클라이언트 모킹
jest.mock('@/lib/supabase/client')

describe('QuoteService', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  }

  const mockFrom = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createBrowserClient as jest.Mock).mockReturnValue(mockSupabase)
    mockSupabase.from.mockReturnValue(mockFrom)
  })

  describe('getQuotes', () => {
    it('should fetch quotes with filters', async () => {
      const mockQuotes = [
        {
          id: '1',
          quote_number: 'Q-2024-001',
          project_title: 'Test Project',
          total_amount: 1000000,
          status: 'draft',
        },
      ]

      mockFrom.range.mockResolvedValue(
        createSupabaseResponse({ data: mockQuotes, count: 1 })
      )

      const result = await QuoteService.getQuotes(
        { status: ['draft'] },
        1,
        20
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('quotes')
      expect(mockFrom.select).toHaveBeenCalled()
      expect(mockFrom.in).toHaveBeenCalledWith('status', ['draft'])
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      })
      expect(mockFrom.range).toHaveBeenCalledWith(0, 19)

      expect(result).toEqual({
        data: mockQuotes,
        count: 1,
        page: 1,
        total_pages: 1,
      })
    })

    it('should handle search filter', async () => {
      const mockQuotes = []
      mockFrom.range.mockResolvedValue(
        createSupabaseResponse({ data: mockQuotes, count: 0 })
      )

      await QuoteService.getQuotes({ search: 'test' }, 1, 20)

      expect(mockFrom.select).toHaveBeenCalledWith(
        expect.stringContaining('*'),
        expect.objectContaining({ count: 'exact' })
      )
    })

    it('should handle date range filters', async () => {
      const mockQuotes = []
      mockFrom.range.mockResolvedValue(
        createSupabaseResponse({ data: mockQuotes, count: 0 })
      )

      await QuoteService.getQuotes(
        {
          date_from: '2024-01-01',
          date_to: '2024-12-31',
        },
        1,
        20
      )

      expect(mockFrom.eq).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error')
      mockFrom.range.mockResolvedValue(createSupabaseResponse(null, error))

      await expect(
        QuoteService.getQuotes({}, 1, 20)
      ).rejects.toThrow('Database error')
    })
  })

  describe('getQuoteById', () => {
    it('should fetch quote by id with all relations', async () => {
      const mockQuote = {
        id: '1',
        quote_number: 'Q-2024-001',
        title: 'Test Project',
        client: { name: 'Test Customer' },
        items: [],
      }

      mockFrom.single.mockResolvedValue(
        createSupabaseResponse(mockQuote)
      )

      const result = await QuoteService.getQuoteById('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('quotes')
      expect(mockFrom.select).toHaveBeenCalledWith(
        expect.stringContaining('client')
      )
      expect(mockFrom.eq).toHaveBeenCalledWith('id', '1')
      expect(mockFrom.single).toHaveBeenCalled()

      expect(result).toEqual(mockQuote)
    })

    it('should throw error if quote not found', async () => {
      mockFrom.single.mockResolvedValue(
        createSupabaseResponse(null, { message: 'Not found' })
      )

      await expect(
        QuoteService.getQuoteById('nonexistent')
      ).rejects.toThrow('Not found')
    })
  })

  describe('createQuote', () => {
    it('should create a new quote', async () => {
      const newQuote = {
        title: 'New Project',
        client_id: 'client-1',
        total_amount: 500000,
      }

      const createdQuote = {
        id: 'new-quote-id',
        ...newQuote,
        quote_number: 'Q-2024-002',
      }

      mockFrom.single.mockResolvedValue(
        createSupabaseResponse(createdQuote)
      )

      const result = await QuoteService.createQuote(newQuote)

      expect(mockSupabase.from).toHaveBeenCalledWith('quotes')
      expect(mockFrom.insert).toHaveBeenCalledWith(newQuote)
      expect(mockFrom.select).toHaveBeenCalled()
      expect(mockFrom.single).toHaveBeenCalled()

      expect(result).toEqual(createdQuote)
    })

    it('should handle creation errors', async () => {
      const newQuote = {
        project_title: 'New Project',
        customer_id: 'customer-1',
      }

      mockFrom.single.mockResolvedValue(
        createSupabaseResponse(null, { message: 'Insert failed' })
      )

      await expect(
        QuoteService.createQuote(newQuote)
      ).rejects.toThrow('Insert failed')
    })
  })

  describe('updateQuote', () => {
    it('should update an existing quote', async () => {
      const updates = {
        title: 'Updated Project',
        status: 'sent' as const,
      }

      const updatedQuote = {
        id: '1',
        ...updates,
        quote_number: 'Q-2024-001',
      }

      mockFrom.single.mockResolvedValue(
        createSupabaseResponse(updatedQuote)
      )

      const result = await QuoteService.updateQuote('1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('quotes')
      expect(mockFrom.update).toHaveBeenCalledWith(updates)
      expect(mockFrom.eq).toHaveBeenCalledWith('id', '1')
      expect(mockFrom.select).toHaveBeenCalled()
      expect(mockFrom.single).toHaveBeenCalled()

      expect(result).toEqual(updatedQuote)
    })
  })

  describe('deleteQuote', () => {
    it('should delete a quote', async () => {
      mockFrom.eq.mockResolvedValue(
        createSupabaseResponse({ id: '1' })
      )

      await QuoteService.deleteQuote('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('quotes')
      expect(mockFrom.delete).toHaveBeenCalled()
      expect(mockFrom.eq).toHaveBeenCalledWith('id', '1')
    })

    it('should handle deletion errors', async () => {
      mockFrom.eq.mockResolvedValue(
        createSupabaseResponse(null, { message: 'Delete failed' })
      )

      await expect(
        QuoteService.deleteQuote('1')
      ).rejects.toThrow('Delete failed')
    })
  })
})