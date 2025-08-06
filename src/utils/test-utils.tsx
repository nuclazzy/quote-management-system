import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { AuthProvider } from '@/contexts/AuthContext'

// 기본 테마 생성
const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

// 모든 프로바이더를 포함하는 래퍼 컴포넌트
interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

// 커스텀 render 함수
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'
export { customRender as render }

// 테스트용 모의 데이터 생성 헬퍼
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  profile: {
    id: 'test-profile-id',
    full_name: 'Test User',
    role: 'admin',
    company_id: 'test-company-id',
  },
}

export const mockQuote = {
  id: 'test-quote-id',
  quote_number: 'Q-2024-001',
  project_title: 'Test Project',
  customer_name_snapshot: 'Test Customer',
  total_amount: 1000000,
  status: 'draft',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockCustomer = {
  id: 'test-customer-id',
  name: 'Test Customer',
  business_number: '123-45-67890',
  contact_person: 'John Doe',
  phone: '010-1234-5678',
  email: 'customer@example.com',
  address: 'Seoul, Korea',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  total_revenue: 5000000,
  total_cost: 3000000,
  status: 'active',
  created_at: new Date().toISOString(),
  quotes: {
    id: 'test-quote-id',
    quote_number: 'Q-2024-001',
    customer_name_snapshot: 'Test Customer',
  },
}

// 비동기 작업을 기다리는 헬퍼
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

// LocalStorage 모킹 헬퍼
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
    }),
  }
}

// Supabase 응답 모킹 헬퍼
export const createSupabaseResponse = <T,>(data: T | null, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
})