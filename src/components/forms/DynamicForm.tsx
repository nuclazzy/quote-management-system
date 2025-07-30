'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import FormField from './FormField';

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'number'
    | 'password'
    | 'textarea'
    | 'select'
    | 'autocomplete'
    | 'checkbox'
    | 'switch'
    | 'radio'
    | 'date';
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  validation?: (value: any) => string | undefined;
  options?: Array<{ value: any; label: string; disabled?: boolean }>;
  multiple?: boolean;
  freeSolo?: boolean;
  rows?: number;
  inputProps?: any;
  gridProps?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  dependsOn?: string; // 다른 필드 값에 따라 표시 여부 결정
  showWhen?: (formData: any) => boolean;
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormFieldConfig[];
}

interface DynamicFormProps {
  title?: string;
  sections: FormSection[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  showCancelButton?: boolean;
}

export default function DynamicForm({
  title,
  sections,
  initialData = {},
  onSubmit,
  onCancel,
  submitText = '저장',
  cancelText = '취소',
  loading = false,
  showCancelButton = true,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const updateField = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));

    // 실시간 유효성 검사
    const field = getAllFields().find((f) => f.name === name);
    if (field?.validation && touched[name]) {
      const error = field.validation(value);
      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));
    }
  };

  const getAllFields = (): FormFieldConfig[] => {
    return sections.flatMap((section) => section.fields);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    getAllFields().forEach((field) => {
      const value = formData[field.name];

      // 필수 필드 검사
      if (
        field.required &&
        (!value || (Array.isArray(value) && value.length === 0))
      ) {
        newErrors[field.name] = `${field.label}은(는) 필수 항목입니다.`;
        hasErrors = true;
      }

      // 커스텀 유효성 검사
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.name] = error;
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const shouldShowField = (field: FormFieldConfig): boolean => {
    if (field.showWhen) {
      return field.showWhen(formData);
    }
    return true;
  };

  return (
    <Box component='form' onSubmit={handleSubmit}>
      {title && (
        <Box sx={{ mb: 3 }}>
          <Typography variant='h4' component='h1'>
            {title}
          </Typography>
        </Box>
      )}

      {Object.keys(errors).length > 0 && (
        <Alert severity='error' sx={{ mb: 3 }}>
          폼에 오류가 있습니다. 각 필드를 확인해주세요.
        </Alert>
      )}

      {sections.map((section, sectionIndex) => (
        <Paper key={sectionIndex} sx={{ p: 3, mb: 3 }}>
          <Typography variant='h6' gutterBottom>
            {section.title}
          </Typography>

          {section.description && (
            <Typography variant='body2' color='textSecondary' paragraph>
              {section.description}
            </Typography>
          )}

          <Grid container spacing={3}>
            {section.fields.filter(shouldShowField).map((field) => (
              <Grid
                item
                key={field.name}
                xs={field.gridProps?.xs || 12}
                sm={field.gridProps?.sm || 6}
                md={field.gridProps?.md}
                lg={field.gridProps?.lg}
                xl={field.gridProps?.xl}
              >
                <FormField
                  {...field}
                  value={formData[field.name]}
                  onChange={(value) => updateField(field.name, value)}
                  error={errors[field.name]}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        {showCancelButton && onCancel && (
          <Button
            variant='outlined'
            startIcon={<CloseIcon />}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
        )}

        <Button
          type='submit'
          variant='contained'
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {loading ? '처리 중...' : submitText}
        </Button>
      </Box>
    </Box>
  );
}
