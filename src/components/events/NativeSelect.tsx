import type { ChangeEvent } from 'react';
import { css } from 'styled-system/css';
import { Box } from 'styled-system/jsx';
import { FaChevronDown } from 'react-icons/fa6';

interface NativeSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  'aria-label'?: string;
}

const selectStyle = css({
  cursor: 'pointer',
  appearance: 'none',
  borderColor: 'border.default',
  borderRadius: 'l2',
  borderWidth: '1px',
  maxW: 'full',
  minH: '11',
  py: '2',
  pl: '3',
  pr: '10',
  color: 'fg.default',
  fontSize: 'sm',
  bgColor: 'bg.default',
  _focusVisible: {
    outline: 'none',
    borderColor: 'accent.default',
    boxShadow: '0 0 0 1px var(--colors-accent-default)'
  }
});

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  ...rest
}: NativeSelectProps) {
  return (
    <Box position="relative" maxW="full">
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
      <Box
        aria-hidden="true"
        position="absolute"
        top="50%"
        right="3"
        transform="translateY(-50%)"
        color="fg.muted"
        fontSize="xs"
        pointerEvents="none"
      >
        <FaChevronDown />
      </Box>
    </Box>
  );
}
