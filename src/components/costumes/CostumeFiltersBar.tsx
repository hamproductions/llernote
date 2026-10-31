import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { FaChevronDown, FaChevronUp, FaFilter } from 'react-icons/fa6';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { useSeries } from '~/hooks/useData';
import { getSeriesShortName } from '~/utils/series-short';
import { seriesTextColor } from '~/utils/series-contrast';
import { useColorModeContext } from '~/context/ColorModeContext';
import { SONG_CATEGORIES, type SongCategory } from '~/utils/song-filter';

export type WitnessFilter = 'witnessed' | 'unwitnessed';

export interface CostumeFilters {
  search: string;
  seriesIds: string[];
  categories: SongCategory[];
  witnessed?: WitnessFilter;
}

export const EMPTY_COSTUME_FILTERS: CostumeFilters = {
  search: '',
  seriesIds: [],
  categories: []
};

const WITNESS: WitnessFilter[] = ['witnessed', 'unwitnessed'];

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap="1">
      <Text
        color="fg.subtle"
        fontSize="2xs"
        fontWeight="bold"
        letterSpacing="wider"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Wrap gap="1">{children}</Wrap>
    </Stack>
  );
}

export function CostumeFiltersBar({
  filters,
  onChange
}: {
  filters: CostumeFilters;
  onChange: (filters: CostumeFilters) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { colorMode } = useColorModeContext();
  const series = useSeries();

  const toggleSeries = (id: string) =>
    onChange({
      ...filters,
      seriesIds: filters.seriesIds.includes(id)
        ? filters.seriesIds.filter((v) => v !== id)
        : [...filters.seriesIds, id]
    });

  const toggleCategory = (category: SongCategory) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(category)
        ? filters.categories.filter((v) => v !== category)
        : [...filters.categories, category]
    });

  const categoryLabel: Record<SongCategory, string> = {
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
            placeholder={t('costumes.search_placeholder')}
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
        <Button size="xs" variant="ghost" onClick={() => onChange(EMPTY_COSTUME_FILTERS)}>
          {t('common.clear')}
        </Button>
      </HStack>

      <HStack
        display={{ base: expanded ? 'flex' : 'none', md: 'flex' }}
        gap="5"
        alignItems="flex-start"
        mt="3"
        flexWrap="wrap"
      >
        <FilterGroup label={t('events.series')}>
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
                onClick={() => toggleSeries(s.id)}
                borderRadius="full"
              >
                {getSeriesShortName(s.id, s.name)}
              </Button>
            );
          })}
        </FilterGroup>

        <FilterGroup label={t('events.category')}>
          {SONG_CATEGORIES.map((category) => (
            <Button
              key={category}
              size="xs"
              variant={filters.categories.includes(category) ? 'solid' : 'outline'}
              onClick={() => toggleCategory(category)}
              borderRadius="full"
            >
              {categoryLabel[category]}
            </Button>
          ))}
        </FilterGroup>

        <FilterGroup label={t('costumes.witness_filter')}>
          {WITNESS.map((status) => {
            const active = filters.witnessed === status;
            return (
              <Button
                key={status}
                size="xs"
                variant={active ? 'solid' : 'outline'}
                onClick={() => onChange({ ...filters, witnessed: active ? undefined : status })}
                borderRadius="full"
              >
                {t(`costumes.${status}`)}
              </Button>
            );
          })}
        </FilterGroup>
      </HStack>
    </Box>
  );
}
