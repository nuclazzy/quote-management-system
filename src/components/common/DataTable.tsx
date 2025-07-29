'use client'

import { useState, useCallback, useMemo, memo } from 'react'
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
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Chip
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import LoadingState from './LoadingState'

export interface Column {
  id: string
  label: string
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  format?: (value: any) => string | React.ReactNode
  sortable?: boolean
  filterable?: boolean
}

export interface TableAction {
  label: string
  icon?: React.ReactNode
  onClick: (row: any) => void
  disabled?: (row: any) => boolean
  color?: 'primary' | 'secondary' | 'error' | 'warning'
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  error?: string
  selectable?: boolean
  searchable?: boolean
  filterable?: boolean
  actions?: TableAction[]
  onSelectionChange?: (selectedIds: string[]) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  emptyMessage?: string
  pagination?: {
    page: number
    rowsPerPage: number
    total: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (rowsPerPage: number) => void
  }
}

const DataTable = memo(function DataTable({
  columns,
  data,
  loading = false,
  error,
  selectable = false,
  searchable = true,
  filterable = false,
  actions = [],
  onSelectionChange,
  onSort,
  emptyMessage = '데이터가 없습니다.',
  pagination
}: DataTableProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activeRow, setActiveRow] = useState<any>(null)

  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map(row => row.id)
      setSelected(newSelected)
      onSelectionChange?.(newSelected)
    } else {
      setSelected([])
      onSelectionChange?.([])
    }
  }, [data, onSelectionChange])

  const handleSelect = useCallback((id: string) => {
    const selectedIndex = selected.indexOf(id)
    let newSelected: string[] = []

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1))
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      )
    }

    setSelected(newSelected)
    onSelectionChange?.(newSelected)
  }, [selected, onSelectionChange])

  const handleSort = useCallback((column: string) => {
    const isAsc = sortColumn === column && sortDirection === 'asc'
    const newDirection = isAsc ? 'desc' : 'asc'
    setSortColumn(column)
    setSortDirection(newDirection)
    onSort?.(column, newDirection)
  }, [sortColumn, sortDirection, onSort])

  const handleActionsClick = useCallback((event: React.MouseEvent<HTMLElement>, row: any) => {
    setAnchorEl(event.currentTarget)
    setActiveRow(row)
  }, [])

  const handleActionsClose = useCallback(() => {
    setAnchorEl(null)
    setActiveRow(null)
  }, [])

  const filteredData = useMemo(() => {
    if (!searchable || !searchTerm) return data
    
    return data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [data, searchable, searchTerm])

  if (loading) {
    return <LoadingState type="skeleton" rows={5} />
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* 검색 및 필터 */}
      {(searchable || filterable) && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {searchable && (
              <TextField
                size="small"
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 300 }}
              />
            )}
            {filterable && (
              <IconButton>
                <FilterIcon />
              </IconButton>
            )}
            {selected.length > 0 && (
              <Chip 
                label={`${selected.length}개 선택됨`}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}

      <TableContainer>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortColumn === column.id}
                      direction={sortColumn === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell align="center" style={{ width: 60 }}>
                  작업
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="textSecondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const isSelected = selected.includes(row.id)
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={row.id}
                    selected={isSelected}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.id]
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format ? column.format(value) : value}
                        </TableCell>
                      )
                    })}
                    {actions.length > 0 && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionsClick(e, row)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 액션 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionsClose}
      >
        {actions.map((action, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              action.onClick(activeRow)
              handleActionsClose()
            }}
            disabled={action.disabled?.(activeRow)}
          >
            {action.icon && (
              <Box sx={{ mr: 1, display: 'flex' }}>
                {action.icon}
              </Box>
            )}
            {action.label}
          </MenuItem>
        ))}
      </Menu>

      {/* 페이지네이션 */}
      {pagination && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.rowsPerPage}
          page={pagination.page}
          onPageChange={(_, newPage) => pagination.onPageChange(newPage)}
          onRowsPerPageChange={(e) => pagination.onRowsPerPageChange(parseInt(e.target.value, 10))}
        />
      )}
    </Paper>
  )
})

export default DataTable