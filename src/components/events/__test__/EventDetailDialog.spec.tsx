import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '~/i18n';
import { SetlistItemRow } from '../EventDetailDialog';
import type { Song } from '~/types';

vi.mock('~/hooks/useData', () => ({
  useSongById: () =>
    new Map<string, Song>([
      [
        'song-1',
        {
          id: 'song-1',
          name: 'Clickable Song',
          englishName: 'Clickable Song',
          artists: [],
          seriesIds: []
        }
      ]
    ]),
  useArtistById: () => new Map()
}));

vi.mock('~/utils/song-thumbs', () => ({
  hasSongThumb: () => false
}));

describe('SetlistItemRow', () => {
  it('exposes a clickable song details action for setlist songs', async () => {
    const onSelectSong = vi.fn();

    render(
      <SetlistItemRow
        item={{ id: 'item-1', type: 'song', position: 1, songId: 'song-1' }}
        index={1}
        showArtists={false}
        onSelectSong={onSelectSong}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /(?:view details|events\.view_detail)/i })
    );

    expect(onSelectSong).toHaveBeenCalledWith('song-1');
  });
});
