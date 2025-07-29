// Re-export all types for easy importing
export * from './database'
export * from './auth'
export * from './quote'
export * from './notification'

// Common utility types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

export interface FilterState {
  [key: string]: any
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface TableState {
  filters: FilterState
  sort: SortState
  page: number
  per_page: number
}

// Form validation types
export interface FormError {
  field: string
  message: string
}

export interface FormState<T = any> {
  data: T
  errors: FormError[]
  loading: boolean
  dirty: boolean
}

// Notification types
export interface NotificationData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  onClick: () => void
  variant?: 'text' | 'contained' | 'outlined'
}

// Theme types
export interface CustomTheme {
  mode: 'light' | 'dark'
  primaryColor: string
  secondaryColor: string
}