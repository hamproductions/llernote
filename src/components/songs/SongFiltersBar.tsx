import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { FaChevronDown, FaChevronUp, FaFilter } from 'react-icons/fa6';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { NativeSelect } from '~/components/events/NativeSelect';
import { useSeries, useSongs } from '~/hooks/useData';
import { getSeriesShortName } from '~/utils/series-short';
import { seriesTextColor } from '~/utils/series-contrast';
import { useColorModeContext } from '~/context/ColorModeContext';
import {
  EMPTY_SONG_FILTERS,
  SONG_CATEGORIES,
  songReleaseYears,
  type SongFilters
} from '~/utils/song-filter';

const HEARD = ['heard', 'unheard'] as const;

export function SongFiltersBar({
  filters,
  onChange
}: {
  filters: SongFilters;
  onChange: (filters: SongFilters) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { colorMode } = useColorModeContext();
  const series = useSeries();
  const songs = useSongs();
  const yearOptions = songReleaseYears(songs);

  const toggle = (key: 'seriesIds' | 'categories', value: string) => {
    const list = filters[key] as string[];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    });
  };

  const categoryLabel = {
    group: t('mypick.row_group'),
    unit: t('mypick.row_unit'),
    solo: t('mypick.row_solo'),
    others: t('mypick.row_others')
  };

  return (
    <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bgColor="bg.subtle">
      <HStack gap="2" alignItems="flex-start" flexWrap="wrap">
        <Box flex="2" minW="56">
          <Input
            size="sm"
            value={filters.search}
            placeholder={t('songs.search_placeholder')}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </Box>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          hideFrom="md"
        >
          <FaFilter />
          {t('events.filters')}
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </Button>
        <HStack
          display={{ base: expanded ? 'flex' : 'none', md: 'flex' }}
          gap="1"
          alignItems="center"
        >
          <Text color="fg.muted" fontSize="sm">
            {t('songs.release')}
          </Text>
          <NativeSelect
            aria-label={t('events.year_from')}
            value={filters.yearFrom ?? ''}
            placeholder={t('common.all')}
            options={yearOptions.map((y) => ({ value: y, label: y }))}
            onChange={(yearFrom) =>
              onChange({
                ...filters,
                yearFrom: yearFrom || undefined,
                yearTo:
                  yearFrom && filters.yearTo && filters.yearTo < yearFrom
                    ? yearFrom
                    : filters.yearTo
              })
            }
          />
          <Text color="fg.muted" fontSize="sm">
            〜
          </Text>
          <NativeSelect
            aria-label={t('events.year_to')}
            value={filters.yearTo ?? ''}
            placeholder={t('common.all')}
            options={yearOptions.map((y) => ({ value: y, label: y }))}
            onChange={(yearTo) =>
              onChange({
                ...filters,
                yearTo: yearTo || undefined,
                yearFrom:
                  yearTo && filters.yearFrom && filters.yearFrom > yearTo
                    ? yearTo
                    : filters.yearFrom
              })
            }
          />
        </HStack>
        <Button size="xs" variant="ghost" onClick={() => onChange(EMPTY_SONG_FILTERS)}>
          {t('common.clear')}
        </Button>
      </HStack>
      <HStack gap="5" alignItems="flex-start" mt="3" flexWrap="wrap">
        <Stack gap="1">
          <Text
            color="fg.subtle"
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="wider"
            textTransform="uppercase"
          >
            {t('events.series')}
          </Text>
          <Wrap gap="1">
            <Button
              size="xs"
              variant={filters.multiSeries ? 'solid' : 'outline'}
              onClick={() => onChange({ ...filters, multiSeries: !filters.multiSeries })}
              borderRadius="full"
            >
              {t('events.multi_series')}
            </Button>
            {series.map((s) => {
              const active = filters.seriesIds.includes(s.id);
              return (
                <Button
                  key={s.id}
                  size="xs"
                  variant={active ? 'solid' : 'outline'}
                  style={
                    active
                      ? { backgroundColor: s.color, color: 'white', borderColor: s.color }
                      : { color: seriesTextColor(s.color, colorMode) }
                  }
                  title={s.name}
                  onClick={() => toggle('seriesIds', s.id)}
                  borderRadius="full"
                >
                  {getSeriesShortName(s.id, s.name)}
                </Button>
              );
            })}
          </Wrap>
        </Stack>
        <Stack gap="1">
          <Text
            color="fg.subtle"
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="wider"
            textTransform="uppercase"
          >
            {t('events.category')}
          </Text>
          <Wrap gap="1">
            {SONG_CATEGORIES.map((category) => {
              const active = filters.categories.includes(category);
              return (
                <Button
                  key={category}
                  size="xs"
                  variant={active ? 'solid' : 'outline'}
                  onClick={() => toggle('categories', category)}
                  borderRadius="full"
                >
                  {categoryLabel[category]}
                </Button>
              );
            })}
          </Wrap>
        </Stack>
        <Stack gap="1">
          <Text
            color="fg.subtle"
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="wider"
            textTransform="uppercase"
          >
            {t('songs.heard_filter')}
          </Text>
          <Wrap gap="1">
            {HEARD.map((status) => {
              const active = filters.heard === status;
              return (
                <Button
                  key={status}
                  size="xs"
                  variant={active ? 'solid' : 'outline'}
                  onClick={() => onChange({ ...filters, heard: active ? undefined : status })}
                  borderRadius="full"
                >
                  {t(`songs.${status}`)}
                </Button>
              );
            })}
          </Wrap>
        </Stack>
      </HStack>
    </Box>
  );
}
