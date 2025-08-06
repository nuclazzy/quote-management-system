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
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Tooltip,
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
  Settings as SettingsIcon,
  History as HistoryIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

export interface FilterOption {
  label: string;
  value: string | number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filter: Record<string, any>;
  isDefault?: boolean;
  isGlobal?: boolean;
  createdAt: string;
  usageCount?: number;
}

export interface EnhancedFilterProps {
  fields: FilterField[];
  onFilterChange: (filter: Record<string, any>) => void;
  onSearch: () => void;
  onExport?: (filter: Record<string, any>, format: 'csv' | 'excel') => void;
  initialFilter?: Record<string, any>;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filter: Record<string, any>) => void;
  onDeletePreset?: (presetId: string) => void;
  onLoadPreset?: (preset: FilterPreset) => void;
  searchPlaceholder?: string;
  enablePresets?: boolean;
  enableExport?: boolean;
  enableHistory?: boolean;
  maxPresets?: number;
}

export default function EnhancedFilter({
  fields,
  onFilterChange,
  onSearch,
  onExport,
  initialFilter = {},
  presets = [],
  onSavePreset,
  onDeletePreset,
  onLoadPreset,
  searchPlaceholder = '검색어를 입력하세요...',
  enablePresets = true,
  enableExport = true,
  enableHistory = false,
  maxPresets = 10,
}: EnhancedFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Record<string, any>>(initialFilter);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterHistory, setFilterHistory] = useState<FilterPreset[]>([]);

  // Menu states
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [historyMenuAnchor, setHistoryMenuAnchor] = useState<null | HTMLElement>(null);

  // Dialog states
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetIsGlobal, setPresetIsGlobal] = useState(false);

  useEffect(() => {
    updateActiveFilters();
    // 필터 히스토리에 추가 (중복 방지)
    if (enableHistory && Object.keys(filter).length > 0) {
      addToHistory(filter);
    }
  }, [filter]);

  const updateActiveFilters = () => {
    const active: string[] = [];

    fields.forEach((field) => {
      const value = filter[field.id];
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          active.push(field.label);
        } else if (typeof value === 'boolean' && value) {
          active.push(field.label);
        } else if (typeof value !== 'boolean') {
          active.push(field.label);
        }
      }
    });

    setActiveFilters(active);
  };

  const addToHistory = (currentFilter: Record<string, any>) => {
    const historyItem: FilterPreset = {
      id: `history_${Date.now()}`,
      name: `필터 ${new Date().toLocaleString('ko-KR')}`,
      filter: { ...currentFilter },
      isDefault: false,
      isGlobal: false,
      createdAt: new Date().toISOString(),
    };

    setFilterHistory((prev) => {
      const filtered = prev.filter(
        (item) => JSON.stringify(item.filter) !== JSON.stringify(currentFilter)
      );
      return [historyItem, ...filtered].slice(0, maxPresets);
    });
  };

  const handleFilterChange = (fieldId: string, value: any) => {
    const newFilter = { ...filter };
    
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      delete newFilter[fieldId];
    } else {
      newFilter[fieldId] = value;
    }
    
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const clearAllFilters = () => {
    const emptyFilter = {};
    setFilter(emptyFilter);
    onFilterChange(emptyFilter);
  };

  const clearSpecificFilter = (fieldLabel: string) => {
    const field = fields.find(f => f.label === fieldLabel);
    if (field) {
      handleFilterChange(field.id, undefined);
    }
  };

  // Preset handlers
  const handleLoadPreset = (preset: FilterPreset) => {
    setFilter(preset.filter);
    onFilterChange(preset.filter);
    if (onLoadPreset) {
      onLoadPreset(preset);
    }
    setPresetMenuAnchor(null);
    setHistoryMenuAnchor(null);
  };

  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filter);
      setPresetName('');
      setSavePresetDialogOpen(false);
      setPresetIsGlobal(false);
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

  // 필드별 렌더링 함수
  const renderField = (field: FilterField) => {
    const value = filter[field.id];

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            size='small'
            label={field.label}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(field.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size='small'>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              label={field.label}
              onChange={(e) => handleFilterChange(field.id, e.target.value)}
            >
              <MenuItem value=''>전체</MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <Autocomplete
            multiple
            size='small'
            options={field.options || []}
            getOptionLabel={(option) => option.label}
            value={field.options?.filter((option) =>
              Array.isArray(value) ? value.includes(option.value) : false
            ) || []}
            onChange={(_, newValue) =>
              handleFilterChange(field.id, newValue.map((v) => v.value))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                placeholder={field.placeholder}
              />
            )}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.value}
                  label={option.label}
                  size='small'
                  color={option.color}
                />
              ))
            }
          />
        );

      case 'date':
        return (
          <DatePicker
            label={field.label}
            value={value ? dayjs(value) : null}
            onChange={(date) => 
              handleFilterChange(field.id, date ? date.format('YYYY-MM-DD') : undefined)
            }
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            size='small'
            label={field.label}
            type='number'
            value={value || ''}
            onChange={(e) => handleFilterChange(field.id, parseFloat(e.target.value) || undefined)}
            inputProps={{ 
              min: field.min, 
              max: field.max, 
              step: field.step || 1 
            }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFilterChange(field.id, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      default:
        return null;
    }
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
            {/* 히스토리 메뉴 */}
            {enableHistory && filterHistory.length > 0 && (
              <Tooltip title='필터 히스토리'>
                <Button
                  startIcon={<HistoryIcon />}
                  onClick={(e) => setHistoryMenuAnchor(e.currentTarget)}
                  size='small'
                  variant='outlined'
                >
                  히스토리
                </Button>
              </Tooltip>
            )}

            {/* 프리셋 메뉴 */}
            {enablePresets && (presets.length > 0 || onSavePreset) && (
              <Tooltip title='필터 프리셋'>
                <Button
                  startIcon={<BookmarkIcon />}
                  onClick={(e) => setPresetMenuAnchor(e.currentTarget)}
                  size='small'
                  variant='outlined'
                >
                  프리셋
                </Button>
              </Tooltip>
            )}

            {/* 내보내기 메뉴 */}
            {enableExport && onExport && (
              <Tooltip title='데이터 내보내기'>
                <Button
                  startIcon={<ExportIcon />}
                  onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                  size='small'
                  variant='outlined'
                >
                  내보내기
                </Button>
              </Tooltip>
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
            placeholder={searchPlaceholder}
            value={filter.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
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
              {fields.map((field) => (
                <Grid item xs={12} md={field.type === 'boolean' ? 6 : 3} key={field.id}>
                  {renderField(field)}
                </Grid>
              ))}
            </Grid>

            {/* 통계 정보 */}
            {activeFilters.length > 0 && (
              <Alert severity='info' sx={{ mt: 2 }}>
                <Typography variant='body2'>
                  {activeFilters.length}개의 필터가 적용됨
                </Typography>
              </Alert>
            )}
          </Box>
        </Collapse>

        {/* 히스토리 메뉴 */}
        <Menu
          anchorEl={historyMenuAnchor}
          open={Boolean(historyMenuAnchor)}
          onClose={() => setHistoryMenuAnchor(null)}
          PaperProps={{ sx: { maxHeight: 300 } }}
        >
          {filterHistory.map((historyItem) => (
            <MenuItem
              key={historyItem.id}
              onClick={() => handleLoadPreset(historyItem)}
            >
              <Box>
                <Typography variant='body2'>{historyItem.name}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {Object.keys(historyItem.filter).length}개 필터
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>

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

          {presets.length > 0 && onSavePreset && <Divider />}

          {presets.map((preset) => (
            <MenuItem
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
              sx={{ justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {preset.isDefault && <StarIcon sx={{ mr: 1, color: 'primary.main' }} />}
                <Box>
                  <Typography>{preset.name}</Typography>
                  {preset.usageCount && (
                    <Typography variant='caption' color='text.secondary'>
                      {preset.usageCount}회 사용됨
                    </Typography>
                  )}
                </Box>
              </Box>
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
            setPresetIsGlobal(false);
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
            <FormControlLabel
              control={
                <Switch
                  checked={presetIsGlobal}
                  onChange={(e) => setPresetIsGlobal(e.target.checked)}
                />
              }
              label='전체 사용자가 사용할 수 있는 글로벌 프리셋으로 저장'
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setSavePresetDialogOpen(false);
                setPresetName('');
                setPresetIsGlobal(false);
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