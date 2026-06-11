import { useTranslation } from 'react-i18next';
import { Box, HStack } from 'styled-system/jsx';
import { Table } from '~/components/ui/table';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { useArtistById } from '~/hooks/useData';
import { localizedName } from '~/utils/names';
import { clickable } from '~/utils/clickable';
import type { Song } from '~/types';

export function SongTable({
  songs,
  heardCount,
  onSelect
}: {
  songs: Song[];
  heardCount: (songId: string) => number;
  onSelect: (song: Song) => void;
}) {
  const { t, i18n } = useTranslation();
  const artistById = useArtistById();

  const artistNames = (song: Song) =>
    [
      ...new Set(
        (song.artists ?? [])
          .map((a) => artistById.get(a.id))
          .filter(Boolean)
          .map((a) => localizedName(i18n.language, a!.name, a!.englishName))
      )
    ].join('・');

  return (
    <Box w="full" overflowX="auto">
      <Table.Root size="sm">
        <Table.Head zIndex="1" position="sticky" top="0" bgColor="bg.default">
          <Table.Row>
            <Table.Header>{t('songs.song')}</Table.Header>
            <Table.Header>{t('events.cast')}</Table.Header>
            <Table.Header hideBelow="lg">{t('events.series')}</Table.Header>
            <Table.Header hideBelow="md" w="28">
              {t('songs.release')}
            </Table.Header>
            <Table.Header w="20" textAlign="right">
              {t('songs.count')}
            </Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {songs.map((song, i) => {
            const count = heardCount(song.id);
            return (
              <Table.Row
                key={song.id}
                {...clickable(() => onSelect(song))}
                cursor="pointer"
                bgColor={i % 2 === 1 ? 'bg.subtle' : undefined}
                _hover={{ bgColor: 'accent.a2' }}
              >
                <Table.Cell minW="48">
                  <Text
                    color={count > 0 ? 'fg.default' : 'fg.muted'}
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    {localizedName(i18n.language, song.name, song.englishName)}
                  </Text>
                </Table.Cell>
                <Table.Cell maxW="56">
                  <Text color="fg.muted" fontSize="xs" lineClamp={2}>
                    {artistNames(song)}
                  </Text>
                </Table.Cell>
                <Table.Cell hideBelow="lg">
                  <HStack gap="1">
                    {song.seriesIds.slice(0, 2).map((id) => (
                      <SeriesBadge key={id} seriesId={String(id)} />
                    ))}
                  </HStack>
                </Table.Cell>
                <Table.Cell hideBelow="md" color="fg.muted" fontVariantNumeric="tabular-nums">
                  {song.releasedOn ?? '—'}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  {count > 0 ? (
                    <Badge size="sm" variant="solid">
                      {t('songs.times', { count })}
                    </Badge>
                  ) : (
                    <Text color="fg.subtle" fontSize="xs">
                      {t('songs.unheard')}
                    </Text>
                  )}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
