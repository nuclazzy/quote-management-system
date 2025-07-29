'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'

interface Permission {
  id: string
  name: string
  description: string
  category: string
  granted?: boolean
}

interface UserPermission {
  id: string
  is_active: boolean
  granted_at: string
  expires_at?: string
  permissions: Permission
}

interface UserPermissionsDialogProps {
  open: boolean
  onClose: () => void
  user: {
    id: string
    email: string
    full_name: string
    role: string
  } | null
}

export default function UserPermissionsDialog({
  open,
  onClose,
  user
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({})
  const [changedPermissions, setChangedPermissions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string>('')

  // 권한 데이터 로드
  const loadPermissions = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/admin/users/${user.id}/permissions`)
      
      if (!response.ok) {
        throw new Error('Failed to load permissions')
      }

      const data = await response.json()
      setUserPermissions(data.user_permissions)
      setAllPermissions(data.all_permissions)
    } catch (error) {
      console.error('Error loading permissions:', error)
      setError('권한 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 권한 변경 처리
  const handlePermissionChange = (permissionName: string, granted: boolean) => {
    // 현재 권한 상태 업데이트 (UI용)
    setAllPermissions(prev => {
      const updated = { ...prev }
      for (const category in updated) {
        updated[category] = updated[category].map(perm => 
          perm.name === permissionName 
            ? { ...perm, granted }
            : perm
        )
      }
      return updated
    })

    // 변경된 권한 추적
    setChangedPermissions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(permissionName)) {
        newSet.delete(permissionName)
      } else {
        newSet.add(permissionName)
      }
      return newSet
    })
  }

  // 권한 저장
  const handleSavePermissions = async () => {
    if (!user || changedPermissions.size === 0) {
      onClose()
      return
    }

    try {
      setSaving(true)
      setError('')

      // 부여할 권한과 취소할 권한 분리
      const toGrant: string[] = []
      const toRevoke: string[] = []

      for (const permissionName of changedPermissions) {
        let isCurrentlyGranted = false
        
        // 현재 권한 상태 확인
        for (const category in allPermissions) {
          const permission = allPermissions[category].find(p => p.name === permissionName)
          if (permission) {
            isCurrentlyGranted = permission.granted || false
            break
          }
        }

        if (isCurrentlyGranted) {
          toGrant.push(permissionName)
        } else {
          toRevoke.push(permissionName)
        }
      }

      // 권한 부여
      if (toGrant.length > 0) {
        const grantResponse = await fetch(`/api/admin/users/${user.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permission_names: toGrant
          })
        })

        if (!grantResponse.ok) {
          const error = await grantResponse.json()
          throw new Error(error.error || 'Failed to grant permissions')
        }
      }

      // 권한 취소
      if (toRevoke.length > 0) {
        const revokeResponse = await fetch(`/api/admin/users/${user.id}/permissions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permission_names: toRevoke
          })
        })

        if (!revokeResponse.ok) {
          const error = await revokeResponse.json()
          throw new Error(error.error || 'Failed to revoke permissions')
        }
      }

      // 성공 시 다이얼로그 닫기
      onClose()
    } catch (error) {
      console.error('Error saving permissions:', error)
      setError(error instanceof Error ? error.message : '권한 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 카테고리별 권한 개수
  const getCategoryStats = (category: string) => {
    const permissions = allPermissions[category] || []
    const granted = permissions.filter(p => p.granted).length
    const total = permissions.length
    return { granted, total }
  }

  // 카테고리 한글명
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      quotes: '견적서 관리',
      customers: '고객 관리',
      suppliers: '공급업체 관리',
      items: '품목 관리',
      reports: '보고서',
      admin: '시스템 관리'
    }
    return labels[category] || category
  }

  // 권한 설명
  const getPermissionDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      'quotes.view': '견적서 목록 조회 및 상세 정보 확인',
      'quotes.create': '새로운 견적서 작성 및 생성',
      'quotes.edit': '기존 견적서 수정 및 업데이트',
      'quotes.delete': '견적서 삭제',
      'quotes.approve': '견적서 승인 처리',
      'quotes.export': '견적서 PDF/Excel 내보내기',
      'customers.view': '고객 목록 조회 및 정보 확인',
      'customers.create': '새 고객 등록',
      'customers.edit': '고객 정보 수정',
      'customers.delete': '고객 삭제',
      'suppliers.view': '공급업체 목록 조회',
      'suppliers.create': '새 공급업체 등록',
      'suppliers.edit': '공급업체 정보 수정',
      'suppliers.delete': '공급업체 삭제',
      'items.view': '품목 목록 조회',
      'items.create': '새 품목 등록',
      'items.edit': '품목 정보 수정',
      'items.delete': '품목 삭제',
      'reports.view': '보고서 조회',
      'reports.export': '보고서 내보내기',
      'users.view': '사용자 목록 조회',
      'users.create': '새 사용자 생성',
      'users.edit': '사용자 정보 수정',
      'users.delete': '사용자 삭제',
      'permissions.manage': '권한 관리',
      'system.settings': '시스템 설정 관리'
    }
    return descriptions[name] || '권한 설명이 없습니다.'
  }

  useEffect(() => {
    if (open && user) {
      loadPermissions()
      setChangedPermissions(new Set())
      setError('')
    }
  }, [open, user])

  if (!user) return null

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Box>
            <Typography variant="h6">
              사용자 권한 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.full_name} ({user.email})
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* 사용자 역할 정보 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                현재 역할
              </Typography>
              <Chip
                label={user.role === 'super_admin' ? '최고 관리자' :
                      user.role === 'admin' ? '관리자' : '일반 사용자'}
                color={user.role === 'super_admin' ? 'error' :
                       user.role === 'admin' ? 'warning' : 'primary'}
              />
              {user.role === 'super_admin' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  최고 관리자는 모든 권한을 자동으로 보유합니다.
                </Typography>
              )}
            </Box>

            {/* 권한 카테고리별 아코디언 */}
            {Object.entries(allPermissions).map(([category, permissions]) => {
              const stats = getCategoryStats(category)
              
              return (
                <Accordion key={category} defaultExpanded={stats.granted > 0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        {getCategoryLabel(category)}
                      </Typography>
                      <Chip
                        label={`${stats.granted}/${stats.total}`}
                        size="small"
                        color={stats.granted === stats.total ? 'success' : 
                               stats.granted > 0 ? 'warning' : 'default'}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={1}>
                      {permissions.map((permission) => (
                        <Grid item xs={12} key={permission.id}>
                          <Box sx={{ 
                            p: 2, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: permission.granted ? 'success.50' : 'grey.50'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {permission.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {getPermissionDescription(permission.name)}
                                </Typography>
                              </Box>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={permission.granted || false}
                                    onChange={(e) => handlePermissionChange(permission.name, e.target.checked)}
                                    disabled={user.role === 'super_admin'}
                                  />
                                }
                                label=""
                                sx={{ m: 0 }}
                              />
                            </Box>
                            {changedPermissions.has(permission.name) && (
                              <Chip
                                label="변경됨"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )
            })}

            {changedPermissions.size > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {changedPermissions.size}개의 권한이 변경되었습니다. 저장을 클릭하여 적용하세요.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={onClose}
          disabled={saving}
        >
          취소
        </Button>
        <Button
          onClick={handleSavePermissions}
          variant="contained"
          disabled={saving || changedPermissions.size === 0}
          startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          {saving ? '저장 중...' : '저장'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}