import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'

describe('useErrorHandler', () => {
  // console.error를 모킹하여 테스트 중 에러 출력 방지
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('should handle Error objects', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const error = new Error('Test error message')
    let errorMessage: string = ''
    
    act(() => {
      errorMessage = result.current.handleError(error)
    })
    
    expect(errorMessage).toBe('Test error message')
    expect(console.error).toHaveBeenCalledWith('Error occurred:', error)
  })

  it('should handle string errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    let errorMessage: string = ''
    
    act(() => {
      errorMessage = result.current.handleError('String error')
    })
    
    expect(errorMessage).toBe('String error')
    expect(console.error).toHaveBeenCalledWith('Error occurred:', 'String error')
  })

  it('should handle Supabase errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const supabaseError = {
      message: 'Database error',
      code: 'PGRST116',
      details: 'Some details',
    }
    
    let errorMessage: string = ''
    
    act(() => {
      errorMessage = result.current.handleError(supabaseError)
    })
    
    expect(errorMessage).toBe('Database error')
    expect(console.error).toHaveBeenCalledWith('Error occurred:', supabaseError)
  })

  it('should handle unknown error types', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const unknownError = { someField: 'someValue' }
    
    let errorMessage: string = ''
    
    act(() => {
      errorMessage = result.current.handleError(unknownError)
    })
    
    expect(errorMessage).toBe('알 수 없는 오류가 발생했습니다.')
    expect(console.error).toHaveBeenCalledWith('Error occurred:', unknownError)
  })

  it('should handle null errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    let errorMessage: string = ''
    
    act(() => {
      errorMessage = result.current.handleError(null)
    })
    
    expect(errorMessage).toBe('알 수 없는 오류가 발생했습니다.')
  })

  it('should handle undefined errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    let errorMessage: string = ''
    
    act(() => {
      errorMessage = result.current.handleError(undefined)
    })
    
    expect(errorMessage).toBe('알 수 없는 오류가 발생했습니다.')
  })

  it('should format error messages for common scenarios', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const testCases = [
      {
        error: new Error('Network error'),
        expected: 'Network error',
      },
      {
        error: { message: 'Permission denied' },
        expected: 'Permission denied',
      },
      {
        error: 'Invalid input',
        expected: 'Invalid input',
      },
    ]
    
    testCases.forEach(({ error, expected }) => {
      let errorMessage: string = ''
      
      act(() => {
        errorMessage = result.current.handleError(error)
      })
      
      expect(errorMessage).toBe(expected)
    })
  })
})