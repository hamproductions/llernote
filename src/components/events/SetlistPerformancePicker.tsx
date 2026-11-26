import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { getAliasScore } from '~/utils/abbreviations';

export type SetlistPerformanceOption = {
  value: string;
  date: string;
  title: string;
  subtitle: string;
  venue: string;
  isSameTour: boolean;
  searchText: string;
  aliases: string[];
};

export function SetlistPerformancePicker({
  label,
  value,
  options,
  currentPerformanceId,
  previousPerformanceId,
  onChange
}: {
  label: string;
  value: string;
  options: SetlistPerformanceOption[];
  currentPerformanceId: string;
  previousPerformanceId?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const matches = normalizedQuery
      ? options.filter(
          (option) =>
            option.searchText.includes(normalizedQuery) ||
            getAliasScore(option.aliases, normalizedQuery) > 0
        )
      : options.filter((option) => option.isSameTour);
    const fallbackMatches = normalizedQuery || matches.length > 0 ? matches : options;
    return fallbackMatches.slice(0, normalizedQuery ? 50 : 20);
  }, [normalizedQuery, options]);

  return (
    <Stack
      gap="2"
      borderColor="border.subtle"
      borderRadius="l2"
      borderWidth="1px"
      minW="0"
      p="3"
      bgColor="bg.canvas"
    >
      <HStack gap="2" justifyContent="space-between" alignItems="center">
        <Text color="fg.muted" fontSize="xs" fontWeight="semibold">
          {label}
        </Text>
        <HStack gap="1">
          {previousPerformanceId && (
            <Button size="xs" variant="ghost" onClick={() => onChange(previousPerformanceId)}>
              {t('events.setlist_picker_previous')}
            </Button>
          )}
          <Button size="xs" variant="ghost" onClick={() => onChange(currentPerformanceId)}>
            {t('events.setlist_picker_current')}
          </Button>
        </HStack>
      </HStack>

      {selected && (
        <Stack gap="0.5" borderRadius="l2" py="2" px="3" bgColor="bg.subtle">
          <Text fontSize="xs" fontWeight="semibold" lineClamp={2}>
            {selected.title}
          </Text>
          <Text color="fg.muted" fontSize="2xs" lineClamp={2}>
            {selected.date} · {selected.subtitle}
            {selected.venue ? ` · ${selected.venue}` : ''}
          </Text>
        </Stack>
      )}

      <Input
        size="sm"
        value={query}
        aria-label={t('events.setlist_picker_search')}
        placeholder={t('events.setlist_picker_search')}
        onChange={(event) => setQuery(event.target.value)}
      />

      <Stack gap="1" maxH="64" pr="1" overflowY="auto">
        {filteredOptions.map((option) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              size="sm"
              variant={isSelected ? 'subtle' : 'ghost'}
              onClick={() => onChange(option.value)}
              justifyContent="flex-start"
              h="auto"
              py="2"
              px="2"
              textAlign="left"
            >
              <Stack gap="0.5" alignItems="stretch" minW="0">
                <Text fontSize="xs" fontWeight={isSelected ? 'semibold' : 'medium'} lineClamp={2}>
                  {option.title}
                </Text>
                <Text color="fg.muted" fontSize="2xs" lineClamp={2}>
                  {option.date} · {option.subtitle}
                  {option.venue ? ` · ${option.venue}` : ''}
                </Text>
              </Stack>
            </Button>
          );
        })}
        {filteredOptions.length === 0 && (
          <Text py="3" px="2" color="fg.muted" fontSize="xs">
            {t('common.no_results')}
          </Text>
        )}
      </Stack>

      <Text color="fg.subtle" fontSize="2xs">
        {normalizedQuery
          ? t('events.setlist_picker_filtered_hint', { count: filteredOptions.length })
          : t('events.setlist_picker_relevant_hint')}
      </Text>
    </Stack>
  );
}
