import { useState } from 'react';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { orderSongsPerCastRows, type SongsPerCastRow } from '~/utils/setlistAnalysis';
import { H, Panel, TYPE, useInfo } from './shared';

const CAST_TYPES = ['group', 'subunit', 'solo', 'collab'] as const;

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bg="bg.default">
      <Text fontSize="2xl" fontWeight="bold" fontVariantNumeric="tabular-nums" lineHeight="1.1">
        {value}
      </Text>
      <Text color="fg.muted" fontSize="2xs" letterSpacing="wide" textTransform="uppercase">
        {label}
      </Text>
    </Box>
  );
}

function CastRow({ row, includeGuests }: { row: SongsPerCastRow; includeGuests: boolean }) {
  const { t, lang, gLabel, typeLabel } = useInfo();
  const breakdown = includeGuests ? row.breakdown : row.homeBreakdown;
  const songs = includeGuests ? row.songs : row.homeSongs;
  const shows = includeGuests ? row.creditedShows : row.homeShows;
  const characterNames = lang === 'ja' ? row.characterNames : row.characterEnglishNames;

  return (
    <Grid
      role="listitem"
      gap={{ base: '2', md: '4' }}
      alignItems="center"
      gridTemplateColumns={{ base: '1fr', md: 'minmax(190px, 1.15fr) minmax(180px, 1.5fr) 220px' }}
      borderColor="border.subtle"
      borderTopWidth="1px"
      py="3"
    >
      <Box minW="0">
        <HStack gap="2" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="semibold">
            {lang === 'ja' ? row.cast : row.castEnglishName || row.cast}
          </Text>
          {includeGuests && row.guestShows > 0 && (
            <Box
              borderRadius="full"
              py="0.5"
              px="2"
              color="orange.11"
              fontSize="2xs"
              fontWeight="semibold"
              bg="orange.3"
            >
              {t('infographic.cast_guest_badge', { count: row.guestShows })}
            </Box>
          )}
        </HStack>
        <Text color="fg.muted" fontSize="xs" lineClamp={1}>
          {characterNames.join(' · ')}
        </Text>
        <Text color="fg.subtle" fontSize="2xs">
          {row.homeGroups.map(gLabel).join(' · ')}
        </Text>
      </Box>

      <Stack gap="1.5" minW="0">
        <HStack
          aria-label={CAST_TYPES.map((type) => `${typeLabel(type)} ${breakdown[type]}`).join(', ')}
          gap="0"
          borderRadius="full"
          h="2.5"
          bg="bg.muted"
          overflow="hidden"
        >
          {CAST_TYPES.map((type) =>
            breakdown[type] > 0 && songs > 0 ? (
              <Box
                key={type}
                title={`${typeLabel(type)}: ${breakdown[type]}`}
                style={{ background: TYPE[type], width: `${(breakdown[type] / songs) * 100}%` }}
                h="full"
              />
            ) : null
          )}
        </HStack>
        <Wrap gap="3" color="fg.muted" fontSize="2xs">
          {CAST_TYPES.map((type) => (
            <HStack key={type} gap="1">
              <Box style={{ background: TYPE[type] }} borderRadius="2px" w="2" h="2" />
              <span>
                {typeLabel(type)} {breakdown[type]}
              </span>
            </HStack>
          ))}
        </Wrap>
      </Stack>

      <Grid gap="2" gridTemplateColumns="repeat(3, 1fr)">
        <Box>
          <Text fontSize="lg" fontWeight="bold" fontVariantNumeric="tabular-nums">
            {songs}
          </Text>
          <Text color="fg.muted" fontSize="2xs">
            {t('infographic.cast_songs')}
          </Text>
        </Box>
        <Box>
          <Text fontSize="lg" fontWeight="bold" fontVariantNumeric="tabular-nums">
            {shows}
          </Text>
          <Text color="fg.muted" fontSize="2xs">
            {t('infographic.cast_credited_shows')}
          </Text>
        </Box>
        <Box>
          <Text fontSize="lg" fontWeight="bold" fontVariantNumeric="tabular-nums">
            {row.appearanceRate == null ? '—' : `${Math.round(row.appearanceRate * 100)}%`}
          </Text>
          <Text color="fg.muted" fontSize="2xs">
            {t('infographic.cast_home_appearance', {
              shows: row.homeShows,
              total: row.eligibleHomeShows
            })}
          </Text>
        </Box>
      </Grid>
    </Grid>
  );
}

export function SongsPerCast() {
  const { d, t } = useInfo();
  const [includeGuests, setIncludeGuests] = useState(true);
  const analysis = d.castAnalysis;
  const rows = orderSongsPerCastRows(analysis.rows as SongsPerCastRow[], includeGuests);

  return (
    <>
      <H>{t('infographic.cast_title')}</H>
      <Text maxW="4xl" color="fg.muted" fontSize="sm">
        {t('infographic.cast_sub')}
      </Text>

      <Grid gap="2.5" gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }}>
        <Metric value={analysis.avgSongsPerCastShow ?? '—'} label={t('infographic.cast_avg_all')} />
        <Metric
          value={analysis.avgSongsPerCastShowWithoutGuests ?? '—'}
          label={t('infographic.cast_avg_no_guests')}
        />
        <Metric
          value={`${analysis.showsWithGuests} / ${analysis.selectedShows}`}
          label={t('infographic.cast_guest_shows')}
        />
      </Grid>

      <HStack gap="1.5" flexWrap="wrap">
        {([true, false] as const).map((value) => {
          const active = includeGuests === value;
          return (
            <Box
              as="button"
              key={String(value)}
              aria-pressed={active}
              onClick={() => setIncludeGuests(value)}
              cursor="pointer"
              borderColor={active ? 'accent.default' : 'border.subtle'}
              borderRadius="l2"
              borderWidth="1px"
              py="1.5"
              px="3"
              color={active ? 'accent.fg' : 'fg.muted'}
              fontSize="sm"
              fontWeight="medium"
              bg={active ? 'accent.default' : 'bg.default'}
            >
              {t(value ? 'infographic.cast_include_guests' : 'infographic.cast_exclude_guests')}
            </Box>
          );
        })}
      </HStack>

      <Panel>
        {rows.length ? (
          <Box role="list" aria-label={t('infographic.cast_title')}>
            {rows.slice(0, 20).map((row) => (
              <CastRow key={row.cast} row={row} includeGuests={includeGuests} />
            ))}
            {rows.length > 20 && (
              <Box as="details">
                <Box as="summary" cursor="pointer" py="3" color="fg.muted" fontSize="sm">
                  {t('infographic.cast_show_all', { count: rows.length - 20 })}
                </Box>
                {rows.slice(20).map((row) => (
                  <CastRow key={row.cast} row={row} includeGuests={includeGuests} />
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Text py="8" color="fg.muted" textAlign="center">
            {t('infographic.cast_empty')}
          </Text>
        )}
      </Panel>

      <Text maxW="4xl" color="fg.subtle" fontSize="2xs">
        {t('infographic.cast_method', { count: analysis.unresolvedCastCredits })}
      </Text>
    </>
  );
}
