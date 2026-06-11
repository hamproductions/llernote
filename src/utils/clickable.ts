import type { KeyboardEvent } from 'react';
import { css } from 'styled-system/css';

export const focusRing = css({
  _focusVisible: {
    outline: '2px solid',
    outlineOffset: '1px',
    outlineColor: 'accent.default'
  }
});

export const clickable = (onClick: () => void, label?: string) => ({
  role: 'button' as const,
  tabIndex: 0,
  className: focusRing,
  'aria-label': label,
  onClick,
  onKeyDown: (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }
});
