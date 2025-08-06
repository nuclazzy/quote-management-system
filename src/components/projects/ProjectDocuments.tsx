'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { createBrowserClient } from '@/lib/supabase/client';

interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: 'contract' | 'report' | 'invoice' | 'other';
  name: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface ProjectDocumentsProps {
  projectId: string;
  onUpdate?: () => void;
}

export default function ProjectDocuments({ projectId, onUpdate }: ProjectDocumentsProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDocumentDialog, setAddDocumentDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState({
    document_type: 'other' as ProjectDocument['document_type'],
    name: '',
    description: '',
  });

  const supabase = createBrowserClient();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now - in real implementation, this would fetch from project_documents table
      const mockDocuments: ProjectDocument[] = [
        {
          id: '1',
          project_id: projectId,
          document_type: 'contract',
          name: '프로젝트 계약서.pdf',
          description: '클라이언트와 체결한 프로젝트 계약서',
          file_url: '/mock/contract.pdf',
          file_size: 1024 * 500, // 500KB
          mime_type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'admin',
        },
        {
          id: '2',
          project_id: projectId,
          document_type: 'report',
          name: '진행 보고서.docx',
          description: '중간 진행 상황 보고서',
          file_url: '/mock/report.docx',
          file_size: 1024 * 200, // 200KB
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'admin',
        },
      ];

      setDocuments(mockDocuments);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocument.name) {
        setNewDocument(prev => ({
          ...prev,
          name: file.name,
        }));
      }
    }
  };

  const handleAddDocument = async () => {
    try {
      if (!selectedFile) {
        setError('파일을 선택해주세요.');
        return;
      }

      // In real implementation, this would:
      // 1. Upload file to Supabase Storage
      // 2. Insert document record to project_documents table
      const newDoc: ProjectDocument = {
        id: Date.now().toString(),
        project_id: projectId,
        ...newDocument,
        file_url: URL.createObjectURL(selectedFile),
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'current_user',
      };

      setDocuments(prev => [newDoc, ...prev]);
      setAddDocumentDialog(false);
      setNewDocument({
        document_type: 'other',
        name: '',
        description: '',
      });
      setSelectedFile(null);

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Error adding document:', err);
      setError(err.message);
    }
  };

  const handleDownload = (document: ProjectDocument) => {
    if (document.file_url) {
      // In real implementation, this would handle secure file download
      window.open(document.file_url, '_blank');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      // In real implementation, this would delete from database and storage
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message);
    }
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <FileIcon />;
    
    if (mimeType.includes('pdf')) return <PdfIcon />;
    if (mimeType.includes('image')) return <ImageIcon />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DescriptionIcon />;
    
    return <FileIcon />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDocumentTypeText = (type: ProjectDocument['document_type']) => {
    const typeMap = {
      contract: '계약서',
      report: '보고서',
      invoice: '세금계산서',
      other: '기타',
    };
    return typeMap[type] || type;
  };

  const getDocumentTypeColor = (type: ProjectDocument['document_type']) => {
    switch (type) {
      case 'contract':
        return 'primary';
      case 'report':
        return 'info';
      case 'invoice':
        return 'warning';
      case 'other':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={200}>
        <Typography>문서를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">프로젝트 문서</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDocumentDialog(true)}
        >
          문서 추가
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        {documents.length === 0 ? (
          <Box textAlign="center" py={4}>
            <AttachFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              프로젝트 문서가 없습니다
            </Typography>
            <Typography variant="caption" color="text.secondary">
              계약서, 보고서, 기타 관련 문서를 업로드하세요
            </Typography>
          </Box>
        ) : (
          <List>
            {documents.map((document) => (
              <ListItem key={document.id} divider>
                <ListItemIcon>
                  {getDocumentIcon(document.mime_type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {document.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={getDocumentTypeText(document.document_type)}
                        color={getDocumentTypeColor(document.document_type) as any}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      {document.description && (
                        <Typography variant="body2" color="text.secondary">
                          {document.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(document.file_size)} • 
                        {new Date(document.uploaded_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDownload(document)}
                    sx={{ mr: 1 }}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(document.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* 문서 추가 다이얼로그 */}
      <Dialog
        open={addDocumentDialog}
        onClose={() => setAddDocumentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>문서 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <input
                accept="*/*"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  파일 선택
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" color="text.secondary">
                  선택된 파일: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
              )}
            </Box>

            <FormControl fullWidth>
              <InputLabel>문서 유형</InputLabel>
              <Select
                value={newDocument.document_type}
                label="문서 유형"
                onChange={(e: SelectChangeEvent<ProjectDocument['document_type']>) =>
                  setNewDocument(prev => ({
                    ...prev,
                    document_type: e.target.value as ProjectDocument['document_type'],
                  }))
                }
              >
                <MenuItem value="contract">계약서</MenuItem>
                <MenuItem value="report">보고서</MenuItem>
                <MenuItem value="invoice">세금계산서</MenuItem>
                <MenuItem value="other">기타</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="문서명"
              value={newDocument.name}
              onChange={(e) =>
                setNewDocument(prev => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />

            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={newDocument.description}
              onChange={(e) =>
                setNewDocument(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDocumentDialog(false)}>취소</Button>
          <Button onClick={handleAddDocument} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}