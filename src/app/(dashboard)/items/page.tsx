'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Alert,
} from '@mui/material'
import { Add, Category, Inventory } from '@mui/icons-material'
import { ItemService, type ItemCategory, type Item } from '@/lib/services/item-service'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { CategoryManagement } from '@/components/items/CategoryManagement'
import { ItemList } from '@/components/items/ItemList'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function ItemsPage() {
  const { handleError } = useErrorHandler()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [items, setItems] = useState<Item[]>([])

  // 데이터 조회
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [categoriesData, itemsData] = await Promise.all([
        ItemService.getCategories(),
        ItemService.getItems()
      ])
      
      setCategories(categoriesData)
      setItems(itemsData)
    } catch (err) {
      const errorMessage = handleError(err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    fetchData()
  }, [])

  // 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // 카테고리 새로고침
  const refreshCategories = async () => {
    try {
      const categoriesData = await ItemService.getCategories()
      setCategories(categoriesData)
    } catch (err) {
      const errorMessage = handleError(err)
      setError(errorMessage)
    }
  }

  // 품목 새로고침
  const refreshItems = async () => {
    try {
      const itemsData = await ItemService.getItems()
      setItems(itemsData)
    } catch (err) {
      const errorMessage = handleError(err)
      setError(errorMessage)
    }
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert 
          message={error} 
          onRetry={fetchData} 
        />
      </Box>
    )
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          품목 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          품목 카테고리와 품목 정보를 관리합니다
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Category sx={{ color: 'primary.main', mr: 2 }} />
                <Typography variant="h6">카테고리</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {categories.length}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory sx={{ color: 'success.main', mr: 2 }} />
                <Typography variant="h6">품목</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {items.length}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory sx={{ color: 'warning.main', mr: 2 }} />
                <Typography variant="h6">재고 부족</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {items.filter(item => 
                  item.minimum_stock_level && 
                  item.stock_quantity <= item.minimum_stock_level
                ).length}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory sx={{ color: 'info.main', mr: 2 }} />
                <Typography variant="h6">총 재고가치</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                ₩{items.reduce((sum, item) => sum + (item.unit_price * item.stock_quantity), 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 네비게이션 */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              label="카테고리 관리" 
              icon={<Category />}
              iconPosition="start"
            />
            <Tab 
              label="품목 관리" 
              icon={<Inventory />}
              iconPosition="start"
            />
          </Tabs>
        </Box>
        
        {/* 카테고리 관리 탭 */}
        <TabPanel value={tabValue} index={0}>
          <CategoryManagement
            categories={categories}
            onRefresh={refreshCategories}
          />
        </TabPanel>
        
        {/* 품목 관리 탭 */}
        <TabPanel value={tabValue} index={1}>
          <ItemList
            items={items}
            categories={categories}
            onRefresh={refreshItems}
          />
        </TabPanel>
      </Card>
    </Box>
  )
}