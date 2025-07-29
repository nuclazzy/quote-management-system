'use client'

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Switch,
  Radio,
  RadioGroup,
  FormLabel,
  Box,
  Typography
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'

interface BaseFieldProps {
  name: string
  label: string
  value: any
  onChange: (value: any) => void
  error?: string
  required?: boolean
  disabled?: boolean
  fullWidth?: boolean
  helperText?: string
}

interface TextFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'number' | 'password' | 'textarea'
  placeholder?: string
  multiline?: boolean
  rows?: number
  inputProps?: any
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select'
  options: Array<{ value: any; label: string; disabled?: boolean }>
  multiple?: boolean
}

interface AutocompleteFieldProps extends BaseFieldProps {
  type: 'autocomplete'
  options: Array<{ value: any; label: string }>
  multiple?: boolean
  freeSolo?: boolean
}

interface CheckboxFieldProps extends BaseFieldProps {
  type: 'checkbox'
}

interface SwitchFieldProps extends BaseFieldProps {
  type: 'switch'
}

interface RadioFieldProps extends BaseFieldProps {
  type: 'radio'
  options: Array<{ value: any; label: string; disabled?: boolean }>
  row?: boolean
}

interface DateFieldProps extends BaseFieldProps {
  type: 'date'
  minDate?: string
  maxDate?: string
}

type FormFieldProps = 
  | TextFieldProps 
  | SelectFieldProps 
  | AutocompleteFieldProps 
  | CheckboxFieldProps 
  | SwitchFieldProps 
  | RadioFieldProps 
  | DateFieldProps

export default function FormField(props: FormFieldProps) {
  const { 
    name, 
    label, 
    value, 
    onChange, 
    error, 
    required = false, 
    disabled = false, 
    fullWidth = true,
    helperText 
  } = props

  const commonProps = {
    name,
    error: !!error,
    disabled,
    fullWidth,
  }

  // Text, Email, Number, Password, Textarea
  if (props.type === 'text' || props.type === 'email' || props.type === 'number' || props.type === 'password' || props.type === 'textarea') {
    return (
      <TextField
        {...commonProps}
        label={label}
        type={props.type === 'textarea' ? 'text' : props.type}
        value={value || ''}
        onChange={(e) => onChange(props.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={props.placeholder}
        multiline={props.type === 'textarea' || props.multiline}
        rows={props.rows}
        inputProps={props.inputProps}
        required={required}
        helperText={error || helperText}
      />
    )
  }

  // Select
  if (props.type === 'select') {
    return (
      <FormControl {...commonProps} required={required}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value || (props.multiple ? [] : '')}
          onChange={(e) => onChange(e.target.value)}
          label={label}
          multiple={props.multiple}
        >
          {props.options.map((option) => (
            <MenuItem 
              key={String(option.value)} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {(error || helperText) && (
          <FormHelperText>{error || helperText}</FormHelperText>
        )}
      </FormControl>
    )
  }

  // Autocomplete
  if (props.type === 'autocomplete') {
    return (
      <Autocomplete
        options={props.options}
        getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        multiple={props.multiple}
        freeSolo={props.freeSolo}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={!!error}
            helperText={error || helperText}
            fullWidth={fullWidth}
          />
        )}
      />
    )
  }

  // Checkbox
  if (props.type === 'checkbox') {
    return (
      <FormControlLabel
        control={
          <Checkbox
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label={label}
      />
    )
  }

  // Switch
  if (props.type === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label={label}
      />
    )
  }

  // Radio
  if (props.type === 'radio') {
    return (
      <FormControl {...commonProps} required={required}>
        <FormLabel component="legend">{label}</FormLabel>
        <RadioGroup
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          row={props.row}
        >
          {props.options.map((option) => (
            <FormControlLabel
              key={String(option.value)}
              value={option.value}
              control={<Radio />}
              label={option.label}
              disabled={option.disabled}
            />
          ))}
        </RadioGroup>
        {(error || helperText) && (
          <FormHelperText error={!!error}>{error || helperText}</FormHelperText>
        )}
      </FormControl>
    )
  }

  // Date
  if (props.type === 'date') {
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <DatePicker
          label={label}
          value={value ? dayjs(value) : null}
          onChange={(newValue) => onChange(newValue ? newValue.format('YYYY-MM-DD') : null)}
          minDate={props.minDate ? dayjs(props.minDate) : undefined}
          maxDate={props.maxDate ? dayjs(props.maxDate) : undefined}
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth,
              required,
              error: !!error,
              helperText: error || helperText,
            },
          }}
        />
      </LocalizationProvider>
    )
  }

  return null
}