import { useTranslation } from 'react-i18next';
import { FaCircleInfo } from 'react-icons/fa6';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { IconButton } from '~/components/ui/icon-button';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SongThumb } from '~/components/songs/SongThumb';
import { useArtistById } from '~/hooks/useData';
import { useSongById } from '~/hooks/useSongData';
import { localizedName } from '~/utils/names';
import { hasSongThumb } from '~/utils/song-thumbs';
import type { SongSetlistInsight } from '~/utils/setlist-insights';
import type { SetlistItem } from '~/types';

export function SetlistItemRow({
  item,
  index,
  showArtists,
  witnessInfo,
  setlistInsight,
  performedBeforeCount,
  onSelectSong
}: {
  item: SetlistItem;
  index: number;
  showArtists: boolean;
  witnessInfo?: { count: number; isFirst: boolean; daysSinceSeen?: number };
  setlistInsight?: SongSetlistInsight;
  performedBeforeCount?: number;
  onSelectSong?: (songId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const songById = useSongById();
  const artistById = useArtistById();
  if (item.type !== 'song') {
    return (
      <HStack gap="2" alignItems="center" py="0.5">
        <Box minW="8" />
        <Badge size="sm" variant="outline" flexShrink={0} color="fg.muted">
          {item.title ?? item.customSongName ?? item.type.toUpperCase()}
        </Badge>
        {item.remarks && (
          <Text color="fg.muted" fontSize="xs" lineClamp={2}>
            {item.remarks}
          </Text>
        )}
      </HStack>
    );
  }
  const song = item.songId ? songById.get(item.songId) : undefined;
  const songLabel = song
    ? localizedName(i18n.language, song.name, song.englishName)
    : (item.customSongName ?? '');
  const artistNames = [
    ...new Set(
      (song?.artists ?? [])
        .map((a) => artistById.get(a.id))
        .filter(Boolean)
        .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
    )
  ].join('・');
  const hasLine2 =
    Boolean(item.remarks) ||
    setlistInsight?.daysSincePreviousPerformance !== undefined ||
    performedBeforeCount !== undefined ||
    (showArtists && Boolean(artistNames));
  return (
    <HStack gap="2.5" alignItems="center" py="1.5">
      <Text
        flexShrink={0}
        minW="7"
        color="fg.subtle"
        fontSize="sm"
        fontVariantNumeric="tabular-nums"
        textAlign="right"
      >
        {index}.
      </Text>
      {song && hasSongThumb(song.id) && <SongThumb songId={song.id} />}
      <Stack flex="1" gap="0.5" minW="0">
        <HStack gap="1.5" minW="0" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
            {songLabel}
          </Text>
          {setlistInsight?.isDebut && (
            <Badge size="sm" variant="solid">
              {t('events.song_debut')}
            </Badge>
          )}
          {witnessInfo?.isFirst ? (
            <Badge size="sm" variant="subtle">
              {t('events.first_witness')}
            </Badge>
          ) : (
            witnessInfo?.daysSinceSeen !== undefined && (
              <Text
                color="fg.subtle"
                fontSize="2xs"
                fontVariantNumeric="tabular-nums"
                whiteSpace="nowrap"
              >
                {t('events.song_days_since_witness', { count: witnessInfo.daysSinceSeen })}
              </Text>
            )
          )}
          {witnessInfo && witnessInfo.count > 1 && (
            <Text
              color="accent.text"
              fontSize="xs"
              fontWeight="semibold"
              fontVariantNumeric="tabular-nums"
            >
              ×{witnessInfo.count}
            </Text>
          )}
        </HStack>
        {hasLine2 && (
          <HStack gap="2" minW="0" color="fg.subtle" fontSize="2xs" flexWrap="wrap">
            {item.remarks && <Text lineClamp={1}>{item.remarks}</Text>}
            {setlistInsight?.daysSincePreviousPerformance !== undefined && (
              <Text fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {t('events.song_days_since_previous', {
                  count: setlistInsight.daysSincePreviousPerformance
                })}
              </Text>
            )}
            {performedBeforeCount !== undefined && (
              <Text fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {t('sort.performed_before', { count: performedBeforeCount })}
              </Text>
            )}
            {showArtists && artistNames && <Text lineClamp={1}>{artistNames}</Text>}
          </HStack>
        )}
      </Stack>
      {song && onSelectSong && (
        <IconButton
          aria-label={`${t('events.view_detail')}: ${songLabel}`}
          title={t('events.view_detail')}
          variant="ghost"
          size="xs"
          onClick={() => onSelectSong(song.id)}
          flexShrink={0}
        >
          <FaCircleInfo />
        </IconButton>
      )}
    </HStack>
  );
}
