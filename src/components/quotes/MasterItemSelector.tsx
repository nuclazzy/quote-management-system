'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  InputAdornment,
  Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { MasterItem } from '@/types/motionsense-quote';

interface MasterItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MasterItem) => void;
  masterItems: MasterItem[];
}

export default function MasterItemSelector({ 
  open, 
  onClose, 
  onSelect, 
  masterItems 
}: MasterItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<MasterItem[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems(masterItems);
    } else {
      const filtered = masterItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, masterItems]);

  const handleSelect = (item: MasterItem) => {
    onSelect(item);
    onClose();
    setSearchTerm('');
  };

  const handleClose = () => {
    onClose();
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        마스터 품목 선택
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="품목명, 설명, 카테고리로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? '검색 결과가 없습니다.' : '마스터 품목이 없습니다.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 400, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>품목명</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell align="center">단위</TableCell>
                  <TableCell align="right">기본단가</TableCell>
                  <TableCell align="center">선택</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.category} 
                        size="small" 
                        variant="outlined"
                        color={
                          item.category.includes('편집') ? 'primary' :
                          item.category.includes('제작') ? 'secondary' :
                          item.category.includes('촬영') ? 'success' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {item.default_unit}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {item.default_unit_price.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSelect(item)}
                        sx={{ 
                          bgcolor: 'primary.main',
                          '&:hover': { bgcolor: 'primary.dark' },
                          boxShadow: 'none',
                          '&:hover': { boxShadow: 'none' }
                        }}
                      >
                        선택
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          sx={{ 
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' }
          }}
        >
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}