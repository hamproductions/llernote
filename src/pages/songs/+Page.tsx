import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { SeriesBadge } from '~/components/events/SeriesBadge';
import { Metadata } from '~/components/layout/Metadata';
import { useAttendance } from '~/hooks/useAttendance';
import { usePerformances, useSetlists, useSongById } from '~/hooks/useData';
import { tallySongs } from '~/utils/song-tally';
import { getPicUrl } from '~/utils/assets';

export default function Page() {
  const { t } = useTranslation();
  const { records } = useAttendance();
  const performances = usePerformances();
  const setlists = useSetlists();
  const songById = useSongById();
  const [expanded, setExpanded] = useState<string>();

  const performanceById = useMemo(
    () => new Map(performances.map((p) => [p.id, p])),
    [performances]
  );

  const tally = useMemo(
    () => tallySongs(records, performanceById, setlists),
    [records, performanceById, setlists]
  );

  const total = tally.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <>
      <Metadata title={`${t('songs.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <Stack gap="1">
          <Heading as="h1" fontSize="2xl">
            {t('songs.title')}
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            {t('songs.subtitle')}
          </Text>
        </Stack>
        {tally.length === 0 ? (
          <Text color="fg.muted">{t('songs.empty')}</Text>
        ) : (
          <>
            <Text color="fg.muted" fontSize="sm">
              {t('songs.total_witnessed', { total, unique: tally.length })}
            </Text>
            <Stack gap="2">
              {tally.map((entry, i) => {
                const song = songById.get(entry.songId);
                const isExpanded = expanded === entry.songId;
                return (
                  <Box
                    key={entry.songId}
                    borderColor="border.subtle"
                    borderRadius="l2"
                    borderWidth="1px"
                    overflow="hidden"
                  >
                    <HStack
                      onClick={() => setExpanded(isExpanded ? undefined : entry.songId)}
                      cursor="pointer"
                      gap="3"
                      p="3"
                      _hover={{ bgColor: 'bg.subtle' }}
                    >
                      <Text
                        minW="8"
                        color={i < 3 ? 'accent.default' : 'fg.muted'}
                        fontWeight="bold"
                        fontVariantNumeric="tabular-nums"
                        textAlign="right"
                      >
                        {i + 1}
                      </Text>
                      <Box
                        flexShrink={0}
                        borderRadius="l1"
                        w="10"
                        h="10"
                        bgColor="bg.subtle"
                        overflow="hidden"
                      >
                        <img
                          src={getPicUrl(entry.songId, 'thumbnail')}
                          alt=""
                          loading="lazy"
                          width="40"
                          height="40"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </Box>
                      <Stack flex="1" gap="0" minW="0">
                        <Text fontWeight="medium" lineClamp={1}>
                          {song?.name ?? entry.songId}
                        </Text>
                        <HStack gap="1">
                          {song?.seriesIds.map((id) => (
                            <SeriesBadge key={id} seriesId={String(id)} />
                          ))}
                        </HStack>
                      </Stack>
                      <Badge size="sm" variant="solid">
                        {t('songs.times_other', { count: entry.count })}
                      </Badge>
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </HStack>
                    {isExpanded && (
                      <Stack gap="1" px="4" pt="1" pb="3" bgColor="bg.subtle">
                        <Text color="fg.muted" fontSize="xs" fontWeight="semibold">
                          {t('songs.witnessed_at')}
                        </Text>
                        {entry.performances.map((p) => (
                          <HStack key={p.id} gap="2">
                            <Text color="fg.muted" fontSize="xs" fontVariantNumeric="tabular-nums">
                              {p.date}
                            </Text>
                            <Text fontSize="xs" lineClamp={1}>
                              {p.tourName}
                            </Text>
                          </HStack>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </Stack>
    </>
  );
}
