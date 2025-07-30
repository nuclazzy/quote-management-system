'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Collapse,
  IconButton,
  Chip,
  Autocomplete,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  BookmarkBorder as BookmarkIcon,
  FileDownload as ExportIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { QuoteFilter } from '@/types';

interface FilterOption {
  label: string;
  value: string | number;
}

interface FilterPreset {
  id: string;
  name: string;
  filter: QuoteFilter;
  isDefault?: boolean;
}

interface AdvancedFilterProps {
  onFilterChange: (filter: QuoteFilter) => void;
  onSearch: () => void;
  onExport?: (filter: QuoteFilter, format: 'csv' | 'excel') => void;
  statusOptions?: FilterOption[];
  customerOptions?: FilterOption[];
  userOptions?: FilterOption[];
  initialFilter?: QuoteFilter;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filter: QuoteFilter) => void;
  onDeletePreset?: (presetId: string) => void;
}

const defaultStatusOptions: FilterOption[] = [
  { label: '임시저장', value: 'draft' },
  { label: '발송됨', value: 'sent' },
  { label: '수주확정', value: 'accepted' },
  { label: '수정요청', value: 'revised' },
  { label: '취소됨', value: 'canceled' },
];

export default function AdvancedFilter({
  onFilterChange,
  onSearch,
  onExport,
  statusOptions = defaultStatusOptions,
  customerOptions = [],
  userOptions = [],
  initialFilter = {},
  presets = [],
  onSavePreset,
  onDeletePreset,
}: AdvancedFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<QuoteFilter>(initialFilter);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Menu states
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  // Dialog states
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    updateActiveFilters();
  }, [filter]);

  const updateActiveFilters = () => {
    const active: string[] = [];

    if (filter.search) active.push('검색어');
    if (filter.status?.length) active.push('상태');
    if (filter.customer_id?.length) active.push('고객사');
    if (filter.date_from || filter.date_to) active.push('기간');
    if (filter.amount_min || filter.amount_max) active.push('금액');
    if (filter.created_by?.length) active.push('작성자');

    setActiveFilters(active);
  };

  const handleFilterChange = (updates: Partial<QuoteFilter>) => {
    const newFilter = { ...filter, ...updates };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleMultiSelectChange = (
    field: keyof QuoteFilter,
    value: string[]
  ) => {
    handleFilterChange({ [field]: value.length > 0 ? value : undefined });
  };

  const handleDateChange = (
    field: 'date_from' | 'date_to',
    date: Dayjs | null
  ) => {
    handleFilterChange({
      [field]: date ? date.format('YYYY-MM-DD') : undefined,
    });
  };

  const handleAmountChange = (
    field: 'amount_min' | 'amount_max',
    value: string
  ) => {
    const numValue = parseFloat(value);
    handleFilterChange({
      [field]: isNaN(numValue) ? undefined : numValue,
    });
  };

  const clearAllFilters = () => {
    const emptyFilter: QuoteFilter = {};
    setFilter(emptyFilter);
    onFilterChange(emptyFilter);
  };

  const clearSpecificFilter = (filterName: string) => {
    const updates: Partial<QuoteFilter> = {};

    switch (filterName) {
      case '검색어':
        updates.search = undefined;
        break;
      case '상태':
        updates.status = undefined;
        break;
      case '고객사':
        updates.customer_id = undefined;
        break;
      case '기간':
        updates.date_from = undefined;
        updates.date_to = undefined;
        break;
      case '금액':
        updates.amount_min = undefined;
        updates.amount_max = undefined;
        break;
      case '작성자':
        updates.created_by = undefined;
        break;
    }

    handleFilterChange(updates);
  };

  // Preset handlers
  const handleLoadPreset = (preset: FilterPreset) => {
    setFilter(preset.filter);
    onFilterChange(preset.filter);
    setPresetMenuAnchor(null);
  };

  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filter);
      setPresetName('');
      setSavePresetDialogOpen(false);
    }
  };

  const handleDeletePreset = (presetId: string) => {
    if (onDeletePreset) {
      onDeletePreset(presetId);
    }
    setPresetMenuAnchor(null);
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'excel') => {
    if (onExport) {
      onExport(filter, format);
    }
    setExportMenuAnchor(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ mb: 3 }}>
        {/* 필터 헤더 */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              <Typography variant='h6'>필터</Typography>
              <IconButton onClick={() => setExpanded(!expanded)} size='small'>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {activeFilters.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {activeFilters.map((filterName) => (
                  <Chip
                    key={filterName}
                    label={filterName}
                    size='small'
                    onDelete={() => clearSpecificFilter(filterName)}
                    color='primary'
                    variant='outlined'
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* 프리셋 메뉴 */}
            {(presets.length > 0 || onSavePreset) && (
              <Button
                startIcon={<BookmarkIcon />}
                onClick={(e) => setPresetMenuAnchor(e.currentTarget)}
                size='small'
                variant='outlined'
              >
                프리셋
              </Button>
            )}

            {/* 내보내기 메뉴 */}
            {onExport && (
              <Button
                startIcon={<ExportIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                size='small'
                variant='outlined'
              >
                내보내기
              </Button>
            )}

            {activeFilters.length > 0 && (
              <Button
                startIcon={<ClearIcon />}
                onClick={clearAllFilters}
                size='small'
                variant='outlined'
              >
                전체 초기화
              </Button>
            )}
            <Button
              startIcon={<SearchIcon />}
              onClick={onSearch}
              variant='contained'
              size='small'
            >
              검색
            </Button>
          </Box>
        </Box>

        {/* 간단 검색 (항상 표시) */}
        <Box sx={{ px: 2, pb: expanded ? 0 : 2 }}>
          <TextField
            fullWidth
            placeholder='프로젝트명, 견적서 번호, 고객사명으로 검색...'
            value={filter.search || ''}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            size='small'
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Box>

        {/* 고급 필터 (확장 시에만 표시) */}
        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 1 }}>
            <Grid container spacing={2}>
              {/* 상태 필터 */}
              <Grid item xs={12} md={3}>
                <Autocomplete
                  multiple
                  size='small'
                  options={statusOptions}
                  getOptionLabel={(option) => option.label}
                  value={statusOptions.filter((option) =>
                    filter.status?.includes(option.value as string)
                  )}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'status',
                      newValue.map((v) => v.value as string)
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='상태'
                      placeholder='상태 선택'
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.value}
                        label={option.label}
                        size='small'
                      />
                    ))
                  }
                />
              </Grid>

              {/* 고객사 필터 */}
              <Grid item xs={12} md={3}>
                <Autocomplete
                  multiple
                  size='small'
                  options={customerOptions}
                  getOptionLabel={(option) => option.label}
                  value={customerOptions.filter((option) =>
                    filter.customer_id?.includes(option.value as string)
                  )}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'customer_id',
                      newValue.map((v) => v.value as string)
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='고객사'
                      placeholder='고객사 선택'
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.value}
                        label={option.label}
                        size='small'
                      />
                    ))
                  }
                />
              </Grid>

              {/* 작성자 필터 */}
              <Grid item xs={12} md={3}>
                <Autocomplete
                  multiple
                  size='small'
                  options={userOptions}
                  getOptionLabel={(option) => option.label}
                  value={userOptions.filter((option) =>
                    filter.created_by?.includes(option.value as string)
                  )}
                  onChange={(_, newValue) =>
                    handleMultiSelectChange(
                      'created_by',
                      newValue.map((v) => v.value as string)
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='작성자'
                      placeholder='작성자 선택'
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.value}
                        label={option.label}
                        size='small'
                      />
                    ))
                  }
                />
              </Grid>

              {/* 기간 필터 */}
              <Grid item xs={12} md={3}>
                <DatePicker
                  label='시작일'
                  value={filter.date_from ? dayjs(filter.date_from) : null}
                  onChange={(date) => handleDateChange('date_from', date)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <DatePicker
                  label='종료일'
                  value={filter.date_to ? dayjs(filter.date_to) : null}
                  onChange={(date) => handleDateChange('date_to', date)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>

              {/* 금액 필터 */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size='small'
                  label='최소 금액'
                  type='number'
                  value={filter.amount_min || ''}
                  onChange={(e) =>
                    handleAmountChange('amount_min', e.target.value)
                  }
                  inputProps={{ min: 0, step: 100000 }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size='small'
                  label='최대 금액'
                  type='number'
                  value={filter.amount_max || ''}
                  onChange={(e) =>
                    handleAmountChange('amount_max', e.target.value)
                  }
                  inputProps={{ min: 0, step: 100000 }}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>

        {/* 프리셋 메뉴 */}
        <Menu
          anchorEl={presetMenuAnchor}
          open={Boolean(presetMenuAnchor)}
          onClose={() => setPresetMenuAnchor(null)}
        >
          {onSavePreset && (
            <MenuItem
              onClick={() => {
                setSavePresetDialogOpen(true);
                setPresetMenuAnchor(null);
              }}
            >
              <SaveIcon sx={{ mr: 1 }} />
              현재 필터 저장
            </MenuItem>
          )}

          {presets.length > 0 && onSavePreset && (
            <MenuItem divider disabled>
              저장된 프리셋
            </MenuItem>
          )}

          {presets.map((preset) => (
            <MenuItem
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
              sx={{ justifyContent: 'space-between' }}
            >
              <Typography>{preset.name}</Typography>
              {onDeletePreset && !preset.isDefault && (
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreset(preset.id);
                  }}
                >
                  <ClearIcon fontSize='small' />
                </IconButton>
              )}
            </MenuItem>
          ))}
        </Menu>

        {/* 내보내기 메뉴 */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleExport('csv')}>
            CSV로 내보내기
          </MenuItem>
          <MenuItem onClick={() => handleExport('excel')}>
            Excel로 내보내기
          </MenuItem>
        </Menu>

        {/* 프리셋 저장 다이얼로그 */}
        <Dialog
          open={savePresetDialogOpen}
          onClose={() => {
            setSavePresetDialogOpen(false);
            setPresetName('');
          }}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>필터 프리셋 저장</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label='프리셋 이름'
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder='프리셋 이름을 입력하세요'
              margin='normal'
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setSavePresetDialogOpen(false);
                setPresetName('');
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSavePreset}
              variant='contained'
              disabled={!presetName.trim()}
            >
              저장
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  );
}
