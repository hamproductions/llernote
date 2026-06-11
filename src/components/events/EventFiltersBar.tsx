import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import { Box, HStack, Wrap } from 'styled-system/jsx';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { NativeSelect } from './NativeSelect';
import { PickDialog } from '~/components/mypick/PickDialog';
import { useCharacters, useEventYears, useSeries } from '~/hooks/useData';
import { getSeriesShortName } from '~/utils/series-short';
import { getPicUrl } from '~/utils/assets';
import { localizedName } from '~/utils/names';
import type { EventCategory } from '~/types';
import type { EventFilters } from '~/utils/event-filter';

const CATEGORIES: EventCategory[] = ['live', 'online', 'tv'];

export function EventFiltersBar({
  filters,
  onChange,
  showAttendanceFilter = true
}: {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  showAttendanceFilter?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const series = useSeries();
  const years = useEventYears();
  const characters = useCharacters();
  const [pickingCast, setPickingCast] = useState(false);
  const [pickingYears, setPickingYears] = useState(false);

  const toggle = (key: 'seriesIds' | 'categories', value: string) => {
    const list = filters[key] as string[];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    });
  };

  const castItems = useMemo(
    () =>
      characters.map((c) => ({
        id: c.id,
        label: localizedName(i18n.language, c.fullName, c.englishName),
        sub: c.casts
          .map((cast) => localizedName(i18n.language, cast.seiyuu, cast.englishName))
          .join('・'),
        image: getPicUrl(c.id, c.hasIcon ? 'icons' : 'character')
      })),
    [characters, i18n.language]
  );

  const yearItems = useMemo(() => years.map((y) => ({ id: y, label: y })), [years]);

  const attendanceOptions = [
    { value: 'attended', label: t('events.status_attended') },
    { value: 'interested', label: t('events.status_going') },
    { value: 'none', label: t('events.status_none') }
  ];

  return (
    <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="3" bgColor="bg.subtle">
      <HStack gap="2" alignItems="center" flexWrap="wrap">
        <Box flex="1" minW="56">
          <Input
            size="sm"
            value={filters.search}
            placeholder={t('events.search_placeholder')}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </Box>
        <Button size="sm" variant="outline" onClick={() => setPickingYears(true)}>
          {t('events.year')}
          {filters.years.length > 0 ? ` (${filters.years.length})` : ''}
          <FaChevronDown />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPickingCast(true)}>
          {t('events.cast')}
          {filters.characterIds.length > 0 ? ` (${filters.characterIds.length})` : ''}
          <FaChevronDown />
        </Button>
        {showAttendanceFilter && (
          <NativeSelect
            aria-label={t('events.attendance_filter')}
            value={filters.attendance ?? ''}
            placeholder={`${t('events.attendance_filter')}: ${t('common.all')}`}
            options={attendanceOptions}
            onChange={(attendance) =>
              onChange({
                ...filters,
                attendance: (attendance || undefined) as EventFilters['attendance']
              })
            }
          />
        )}
        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            onChange({
              ...filters,
              search: '',
              seriesIds: [],
              years: [],
              characterIds: [],
              categories: [],
              attendance: undefined
            })
          }
        >
          {t('common.clear')}
        </Button>
      </HStack>
      <Wrap gap="1" mt="2">
        {series.map((s) => {
          const active = filters.seriesIds.includes(s.id);
          return (
            <Button
              key={s.id}
              size="xs"
              variant={active ? 'solid' : 'outline'}
              style={active ? { backgroundColor: s.color, color: 'white' } : { color: s.color }}
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
      </Wrap>

      <PickDialog
        title={t('events.cast')}
        items={castItems}
        selectedIds={filters.characterIds}
        max={Infinity}
        open={pickingCast}
        onClose={() => setPickingCast(false)}
        onChange={(characterIds) => onChange({ ...filters, characterIds })}
      />
      <PickDialog
        title={t('events.year')}
        items={yearItems}
        selectedIds={filters.years}
        max={Infinity}
        open={pickingYears}
        onClose={() => setPickingYears(false)}
        onChange={(years) => onChange({ ...filters, years })}
      />
    </Box>
  );
}
