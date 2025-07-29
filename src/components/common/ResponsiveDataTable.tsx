'use client'

import React, { useState, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import LoadingSkeleton from './LoadingSkeleton'

export interface Column {
  id: string
  label: string
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  format?: (value: any) => string | React.ReactNode
  sortable?: boolean
  filterable?: boolean
  hideOnMobile?: boolean
  priority?: 'high' | 'medium' | 'low' // 모바일에서 우선순위
}

export interface TableAction {
  label: string
  icon?: React.ReactNode
  onClick: (row: any) => void
  disabled?: (row: any) => boolean
  color?: 'primary' | 'secondary' | 'error' | 'warning'
}

interface ResponsiveDataTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  totalCount?: number
  page?: number
  rowsPerPage?: number
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onSearch?: (query: string) => void
  actions?: TableAction[]
  title?: string
  searchPlaceholder?: string
  emptyMessage?: string
  selectable?: boolean
  onSelectionChange?: (selected: string[]) => void
}

// 모바일 카드 컴포넌트
const MobileCard = memo(function MobileCard({
  row,
  columns,
  actions,
  onActionClick,
}: {
  row: any
  columns: Column[]
  actions?: TableAction[]
  onActionClick?: (action: TableAction, row: any) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const primaryColumns = columns.filter(col => col.priority === 'high' || !col.priority)
  const secondaryColumns = columns.filter(col => col.priority === 'medium')
  const tertiaryColumns = columns.filter(col => col.priority === 'low')

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleActionClick = (action: TableAction) => {
    onActionClick?.(action, row)
    handleMenuClose()
  }

  return (
    <Card 
      sx={{ 
        mb: 2,
        '&:hover': {
          boxShadow: 4,
        },
        transition: 'box-shadow 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* 주요 정보 */}
        <Stack spacing={1}>
          {primaryColumns.map((column) => (
            <Box key={column.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  minWidth: 80,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {column.label}
              </Typography>
              <Box sx={{ flex: 1 }}>
                {column.format ? column.format(row[column.id]) : row[column.id]}
              </Box>
            </Box>
          ))}
        </Stack>

        {/* 확장 가능한 추가 정보 */}
        {(secondaryColumns.length > 0 || tertiaryColumns.length > 0) && (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack spacing={1}>
                {[...secondaryColumns, ...tertiaryColumns].map((column) => (
                  <Box key={column.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        minWidth: 80,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {column.label}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      {column.format ? column.format(row[column.id]) : row[column.id]}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Collapse>
        )}
      </CardContent>

      <CardActions 
        sx={{ 
          justifyContent: 'space-between',
          px: 2,
          pb: 2,
        }}
      >
        {(secondaryColumns.length > 0 || tertiaryColumns.length > 0) && (
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ 
              fontSize: '0.75rem',
              minHeight: 32,
            }}
            aria-label={expanded ? '세부정보 숨기기' : '세부정보 보기'}
          >
            {expanded ? '숨기기' : '더보기'}
          </Button>
        )}

        {actions && actions.length > 0 && (
          <Box>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              aria-label="작업 메뉴"
              sx={{ minHeight: 44, minWidth: 44 }} // 터치 타겟 크기
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: { minWidth: 120 },
              }}
            >
              {actions.map((action, index) => (
                <MenuItem
                  key={index}
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled?.(row)}
                  sx={{ 
                    minHeight: 44,
                    '& .MuiListItemIcon-root': {
                      color: action.color ? `${action.color}.main` : 'inherit',
                    },
                  }}
                >
                  {action.icon && (
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                      {action.icon}
                    </Box>
                  )}
                  {action.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
      </CardActions>
    </Card>
  )
})

const ResponsiveDataTable = memo(function ResponsiveDataTable({
  columns,
  data,
  loading = false,
  totalCount = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  onSearch,
  actions,
  title,
  searchPlaceholder = '검색...',
  emptyMessage = '데이터가 없습니다',
}: ResponsiveDataTableProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (columnId: string) => {
    const isAsc = sortColumn === columnId && sortDirection === 'asc'
    const direction: 'asc' | 'desc' = isAsc ? 'desc' : 'asc'
    setSortColumn(columnId)
    setSortDirection(direction)
    onSort?.(columnId, direction)
  }

  const handlePageChange = (event: unknown, newPage: number) => {
    onPageChange?.(newPage)
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10)
    onRowsPerPageChange?.(newRowsPerPage)
  }

  const handleActionClick = (action: TableAction, row: any) => {
    action.onClick(row)
  }

  if (loading) {
    return <LoadingSkeleton variant={isMobile ? 'card' : 'table'} rows={rowsPerPage} />
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        {title && (
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {title}
          </Typography>
        )}
        
        {onSearch && (
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: { xs: '100%', sm: 400 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            aria-label="테이블 검색"
          />
        )}
      </Box>

      {/* 데이터 표시 */}
      {data.length === 0 ? (
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: '1rem' }}
          >
            {emptyMessage}
          </Typography>
        </Paper>
      ) : isMobile ? (
        // 모바일 카드 뷰
        <Box>
          {data.map((row, index) => (
            <MobileCard
              key={row.id || index}
              row={row}
              columns={columns}
              actions={actions}
              onActionClick={handleActionClick}
            />
          ))}
        </Box>
      ) : (
        // 데스크톱 테이블 뷰
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <Table stickyHeader aria-label={title || '데이터 테이블'}>
            <TableHead>
              <TableRow>
                {columns
                  .filter(column => !column.hideOnMobile)
                  .map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      style={{ minWidth: column.minWidth }}
                      sx={{
                        fontWeight: 600,
                        backgroundColor: 'grey.50',
                      }}
                    >
                      {column.sortable ? (
                        <TableSortLabel
                          active={sortColumn === column.id}
                          direction={sortColumn === column.id ? sortDirection : 'asc'}
                          onClick={() => handleSort(column.id)}
                          aria-label={`${column.label}로 정렬`}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        column.label
                      )}
                    </TableCell>
                  ))}
                {actions && actions.length > 0 && (
                  <TableCell align="center" sx={{ width: 80, fontWeight: 600 }}>
                    작업
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  hover
                  key={row.id || index}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {columns
                    .filter(column => !column.hideOnMobile)
                    .map((column) => (
                      <TableCell key={column.id} align={column.align}>
                        {column.format ? column.format(row[column.id]) : row[column.id]}
                      </TableCell>
                    ))}
                  {actions && actions.length > 0 && (
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          const menu = event.currentTarget.nextElementSibling as HTMLElement
                          if (menu) menu.click()
                        }}
                        aria-label="작업 메뉴"
                        sx={{ minHeight: 44, minWidth: 44 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 페이지네이션 */}
      {totalCount > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="페이지당 행 수:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / ${count !== -1 ? count : to} 개`
          }
          sx={{
            mt: 2,
            '& .MuiTablePagination-toolbar': {
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: 1,
            },
            '& .MuiTablePagination-selectLabel': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mb: { xs: 1, sm: 0 },
            },
            '& .MuiTablePagination-displayedRows': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
            },
          }}
        />
      )}
    </Box>
  )
})

export default ResponsiveDataTable