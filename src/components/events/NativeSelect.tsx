import type { ChangeEvent } from 'react';
import { css } from 'styled-system/css';

interface NativeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  'aria-label'?: string;
}

const selectStyle = css({
  cursor: 'pointer',
  borderColor: 'border.default',
  borderRadius: 'l2',
  borderWidth: '1px',
  py: '2',
  px: '3',
  color: 'fg.default',
  fontSize: 'sm',
  bgColor: 'bg.default',
  _focus: { outline: 'none', borderColor: 'accent.default' }
});

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  ...rest
}: NativeSelectProps) {
  return (
    <select
      className={selectStyle}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
