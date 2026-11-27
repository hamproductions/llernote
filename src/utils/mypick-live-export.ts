import { liveHeader } from '~/utils/mypick-live';
import type { BoardCard } from '~/components/mypick/LiveMyPickBoard';
import type { ShortNames } from '~/utils/abbreviations';
import type { Performance, Song } from '~/types';
import type { LiveCostume, MyPickLiveState } from '~/types/mypick-live';

export const shortLiveBoard = (
  board: { liveName: string; awards: BoardCard[]; units: BoardCard[] },
  {
    performances,
    liveState,
    songById,
    costumes,
    songSub,
    artistLabel,
    short
  }: {
    performances: Performance[];
    liveState: MyPickLiveState | null;
    songById: Map<string, Song>;
    costumes: LiveCostume[];
    songSub: (song: Song, short: ShortNames) => string;
    artistLabel: (artistId: string, short: ShortNames) => string | undefined;
    short: ShortNames;
  }
) => {
  const shortPick = (card: BoardCard, picked: Partial<BoardCard['picked']>): BoardCard =>
    card.picked ? { ...card, picked: { ...card.picked, ...picked } } : card;
  const shortSong = (card: BoardCard, songId: string | undefined) => {
    const song = songId ? songById.get(songId) : undefined;
    return song ? shortPick(card, { name: short.song(song), sub: songSub(song, short) }) : card;
  };
  const shortCostume = (card: BoardCard, costumeId: string) => {
    const costume = costumes.find((c) => c.id === costumeId);
    const song = costume?.songId ? songById.get(costume.songId) : undefined;
    return song ? shortPick(card, { sub: short.song(song) }) : card;
  };
  const [first, ...others] = performances;
  return {
    liveName:
      first && others.length === 0
        ? [short.event(first), short.performance(first)].filter(Boolean).join(' ')
        : liveHeader(
            performances.map((performance) => ({
              ...performance,
              tourName: short.event(performance)
            }))
          ).name,
    awards: board.awards.map((card) => {
      const value = liveState?.awards[card.id.slice('award:'.length)];
      return value?.type === 'costume' ? shortCostume(card, value.id) : shortSong(card, value?.id);
    }),
    units: board.units.map((card) => {
      const artistId = card.id.slice('unit:'.length);
      return shortSong(
        { ...card, label: artistLabel(artistId, short) ?? card.label },
        liveState?.unitPicks[artistId]
      );
    })
  };
};
