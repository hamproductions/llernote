import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Skeleton } from '~/components/ui/skeleton';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { FesEventPicker } from '~/components/fes/FesEventPicker';
import { FesReport } from '~/components/fes/FesReport';
import { useFesDays, useFesEvents } from '~/hooks/useFesReport';

export default function Page() {
  const { t } = useTranslation();
  const events = useFesEvents();
  const [picked, setPicked] = useState<string>();
  const event = events.find((e) => e.key === picked) ?? events[0];
  const days = useFesDays(event);

  return (
    <>
      <Metadata title={`${t('fes.title')} - LLerNote`} helmet />
      <Stack gap="4" w="full" maxW="6xl" mx="auto">
        <SectionHeading size="2xl">{t('fes.title')}</SectionHeading>
        <Text maxW="3xl" color="fg.muted">
          {t('fes.subtitle')}
        </Text>
        {events.length === 0 ? (
          <Text color="fg.muted">{t('fes.no_events')}</Text>
        ) : (
          <>
            {event && <FesEventPicker events={events} event={event} onSelect={setPicked} />}
            {event && days ? (
              <FesReport key={event.key} event={event} days={days} />
            ) : (
              <Skeleton h="96" />
            )}
          </>
        )}
      </Stack>
    </>
  );
}
