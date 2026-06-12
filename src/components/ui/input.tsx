import { forwardRef } from 'react';
import { Input as StyledInput, type InputProps as StyledInputProps } from './styled/input';

export type InputProps = StyledInputProps;

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <StyledInput
    ref={ref}
    outline="none"
    borderColor="border.default"
    borderRadius="l2"
    borderWidth="1px"
    minW="0"
    h="10"
    px="3"
    color="fg.default"
    fontSize="sm"
    lineHeight="1.2"
    bgColor="bg.default"
    _disabled={{
      cursor: 'not-allowed',
      color: 'fg.disabled',
      bgColor: 'bg.disabled',
      opacity: 0.72
    }}
    _placeholder={{ color: 'fg.muted' }}
    _focusVisible={{
      borderColor: 'border.emphasized',
      boxShadow: '0 0 0 2px color-mix(in srgb, var(--colors-accent-default) 14%, transparent)'
    }}
    {...props}
  />
));

Input.displayName = 'Input';
