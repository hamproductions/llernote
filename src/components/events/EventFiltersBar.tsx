import { useTranslation } from 'react-i18next';
import { Box, HStack, Wrap } from 'styled-system/jsx';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { NativeSelect } from './NativeSelect';
import { CastFilter } from './CastFilter';
import { useEventYears, useSeries } from '~/hooks/useData';
import { getSeriesShortName } from '~/utils/series-short';
import { seriesTextColor } from '~/utils/series-contrast';
import { useColorModeContext } from '~/context/ColorModeContext';
import type { EventCategory } from '~/types';
import type { EventFilters } from '~/utils/event-filter';

const CATEGORIES: EventCategory[] = ['live', 'online', 'tv'];
const ATTENDANCE = ['attended', 'interested', 'none'] as const;

export function EventFiltersBar({
  filters,
  onChange,
  showAttendanceFilter = true
}: {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  showAttendanceFilter?: boolean;
}) {
  const { t } = useTranslation();
  const { colorMode } = useColorModeContext();
  const series = useSeries();
  const years = useEventYears();
  const yearOptions = [...years].sort();

  const toggle = (key: 'seriesIds' | 'categories', value: string) => {
    const list = filters[key] as string[];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    });
  };

  const attendanceLabel = {
    attended: t('events.status_attended'),
    interested: t('events.status_going'),
    none: t('events.status_none')
  };

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
        <CastFilter
          selectedIds={filters.characterIds}
          onChange={(characterIds) => onChange({ ...filters, characterIds })}
        />
        <HStack gap="1" alignItems="center">
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
        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            onChange({
              search: '',
              seriesIds: [],
              characterIds: [],
              categories: []
            })
          }
        >
          {t('common.clear')}
        </Button>
      </HStack>
      <Wrap gap="1" alignItems="center" mt="2">
        {series.map((s) => {
          const active = filters.seriesIds.includes(s.id);
          return (
            <Button
              key={s.id}
              size="xs"
              variant={active ? 'solid' : 'outline'}
              style={
                active
                  ? { backgroundColor: s.color, color: 'white' }
                  : { color: seriesTextColor(s.color, colorMode) }
              }
              title={s.name}
              onClick={() => toggle('seriesIds', s.id)}
            >
              {getSeriesShortName(s.id, s.name)}
            </Button>
          );
        })}
        <Box w="1px" h="6" mx="1" bgColor="border.default" />
        {CATEGORIES.map((category) => {
          const active = filters.categories.includes(category);
          return (
            <Button
              key={category}
              size="xs"
              variant={active ? 'solid' : 'outline'}
              onClick={() => toggle('categories', category)}
            >
              {t(`events.category_${category}`)}
            </Button>
          );
        })}
        {showAttendanceFilter && (
          <>
            <Box w="1px" h="6" mx="1" bgColor="border.default" />
            {ATTENDANCE.map((status) => {
              const active = filters.attendance === status;
              return (
                <Button
                  key={status}
                  size="xs"
                  variant={active ? 'solid' : 'outline'}
                  onClick={() => onChange({ ...filters, attendance: active ? undefined : status })}
                  colorPalette={status === 'interested' ? 'amber' : undefined}
                >
                  {attendanceLabel[status]}
                </Button>
              );
            })}
          </>
        )}
      </Wrap>
    </Box>
  );
}
