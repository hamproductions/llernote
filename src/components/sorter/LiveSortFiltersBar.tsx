import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp, FaFilter } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { NativeSelect } from '~/components/events/NativeSelect';
import { useColorModeContext } from '~/context/ColorModeContext';
import { useEventYears, useSeries } from '~/hooks/useData';
import { EMPTY_LIVE_SORT_FILTERS, type LiveSortFilters } from '~/hooks/useLiveSortData';
import { seriesTextColor } from '~/utils/series-contrast';
import { getSeriesShortName } from '~/utils/series-short';
import type { EventCategory } from '~/types';

const CATEGORIES: EventCategory[] = ['live', 'online', 'tv'];

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

export function LiveSortFiltersBar({
  filters,
  onChange
}: {
  filters: LiveSortFilters;
  onChange: (filters: LiveSortFilters) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { colorMode } = useColorModeContext();
  const series = useSeries();
  const years = useEventYears();
  const yearOptions = years.map((year) => ({ value: year, label: year }));

  const toggleSeries = (id: string) =>
    onChange({
      ...filters,
      seriesIds: filters.seriesIds.includes(id)
        ? filters.seriesIds.filter((v) => v !== id)
        : [...filters.seriesIds, id]
    });

  const toggleCategory = (category: EventCategory) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(category)
        ? filters.categories.filter((v) => v !== category)
        : [...filters.categories, category]
    });

  return (
    <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bgColor="bg.subtle">
      <HStack gap="2" alignItems="flex-start" flexWrap="wrap">
        <Box flex="2" minW="56">
          <Input
            size="sm"
            value={filters.search}
            placeholder={t('events.search_placeholder')}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </Box>
        <Button
          size="sm"
          variant={filters.attendedOnly ? 'solid' : 'outline'}
          onClick={() => onChange({ ...filters, attendedOnly: !filters.attendedOnly })}
          aria-pressed={filters.attendedOnly}
        >
          {t('sort.attended_only')}
        </Button>
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
        <Button size="xs" variant="ghost" onClick={() => onChange(EMPTY_LIVE_SORT_FILTERS)}>
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
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              size="xs"
              variant={filters.categories.includes(category) ? 'solid' : 'outline'}
              onClick={() => toggleCategory(category)}
              borderRadius="full"
            >
              {t(`events.category_${category}`)}
            </Button>
          ))}
        </FilterGroup>

        <FilterGroup label={t('events.year')}>
          <NativeSelect
            value={filters.yearFrom?.toString() ?? ''}
            aria-label={t('events.year_from')}
            placeholder={t('events.year_from')}
            options={yearOptions}
            onChange={(value) =>
              onChange({ ...filters, yearFrom: value ? Number(value) : undefined })
            }
          />
          <NativeSelect
            value={filters.yearTo?.toString() ?? ''}
            aria-label={t('events.year_to')}
            placeholder={t('events.year_to')}
            options={yearOptions}
            onChange={(value) =>
              onChange({ ...filters, yearTo: value ? Number(value) : undefined })
            }
          />
        </FilterGroup>
      </HStack>
    </Box>
  );
}
