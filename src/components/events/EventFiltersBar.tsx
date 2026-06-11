import { useTranslation } from 'react-i18next';
import { Box, HStack, Wrap } from 'styled-system/jsx';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { NativeSelect } from './NativeSelect';
import { useCharacters, useEventYears, useSeries } from '~/hooks/useData';
import type { EventFilters } from '~/utils/event-filter';

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
  const series = useSeries();
  const years = useEventYears();
  const characters = useCharacters();

  const toggleSeries = (id: string) => {
    onChange({
      ...filters,
      seriesIds: filters.seriesIds.includes(id)
        ? filters.seriesIds.filter((s) => s !== id)
        : [...filters.seriesIds, id]
    });
  };

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
        <NativeSelect
          aria-label={t('events.year')}
          value={filters.year ?? ''}
          placeholder={`${t('events.year')}: ${t('common.all')}`}
          options={years.map((y) => ({ value: y, label: y }))}
          onChange={(year) => onChange({ ...filters, year: year || undefined })}
        />
        <NativeSelect
          aria-label={t('events.cast')}
          value={filters.characterId ?? ''}
          placeholder={`${t('events.cast')}: ${t('common.all')}`}
          options={characters.map((c) => ({
            value: c.id,
            label: `${c.fullName} (${c.casts.map((cast) => cast.seiyuu).join('・')})`
          }))}
          onChange={(characterId) =>
            onChange({ ...filters, characterId: characterId || undefined })
          }
        />
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
        <Button size="xs" variant="ghost" onClick={() => onChange({ search: '', seriesIds: [] })}>
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
              onClick={() => toggleSeries(s.id)}
            >
              {s.name}
            </Button>
          );
        })}
      </Wrap>
    </Box>
  );
}
