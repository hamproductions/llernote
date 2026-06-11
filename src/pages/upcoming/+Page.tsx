import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, HStack, Stack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { EventCard } from '~/components/events/EventCard';
import { EventDetailDialog } from '~/components/events/EventDetailDialog';
import { Metadata } from '~/components/layout/Metadata';
import { usePerformances } from '~/hooks/useData';
import type { Performance } from '~/types';

const daysUntil = (date: string) => {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = date.split('-').map(Number);
  return Math.round((Date.UTC(y!, m! - 1, d!) - todayUtc) / 86400000);
};

export default function Page() {
  const { t } = useTranslation();
  const performances = usePerformances();
  const [selected, setSelected] = useState<Performance>();

  const upcoming = useMemo(() => {
    return performances
      .filter((p) => daysUntil(p.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [performances]);

  return (
    <>
      <Metadata title={`${t('upcoming.title')} - LLerNote`} helmet />
      <Stack gap="4">
        <Heading as="h1" fontSize="2xl">
          {t('upcoming.title')}
        </Heading>
        {upcoming.length === 0 && <Text color="fg.muted">{t('upcoming.empty')}</Text>}
        <Grid
          gap="3"
          alignItems="start"
          gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
        >
          {upcoming.map((p) => {
            const days = daysUntil(p.date);
            return (
              <Stack key={p.id} gap="1">
                <HStack>
                  <Badge size="sm" variant={days <= 7 ? 'solid' : 'outline'}>
                    {days === 0
                      ? t('upcoming.today')
                      : days === 1
                        ? t('upcoming.tomorrow')
                        : t('upcoming.days_until', { count: days })}
                  </Badge>
                </HStack>
                <EventCard performance={p} onClick={() => setSelected(p)} />
              </Stack>
            );
          })}
        </Grid>
        <EventDetailDialog
          performance={selected}
          open={selected !== undefined}
          onClose={() => setSelected(undefined)}
        />
      </Stack>
    </>
  );
}
