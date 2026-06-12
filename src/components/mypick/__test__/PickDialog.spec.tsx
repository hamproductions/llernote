import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '~/i18n';
import { PickDialog } from '../PickDialog';

describe('PickDialog', () => {
  it('can render image-free song choices as tiles', () => {
    render(
      <PickDialog
        title="推し曲"
        items={[{ id: 'song-1', label: 'No thumbnail song', sub: '2024-01-01' }]}
        selectedIds={[]}
        max={1}
        open
        onClose={vi.fn()}
        onChange={vi.fn()}
        display="tiles"
      />
    );

    expect(screen.getByTestId('pick-dialog-grid')).not.toBeNull();
    expect(screen.queryByTestId('pick-dialog-list')).toBeNull();
    expect(screen.getByRole('textbox')).not.toBeNull();
  });
});
