import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Skeleton } from '~/components/ui/skeleton';
import { Metadata } from '~/components/layout/Metadata';
import { SectionHeading } from '~/components/layout/SectionHeading';
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
            <HStack gap="2" flexWrap="wrap">
              <Text color="fg.muted" fontSize="sm">
                {t('fes.pick_event')}
              </Text>
              {events.slice(0, 8).map((e) => (
                <Box
                  as="button"
                  key={e.key}
                  onClick={() => setPicked(e.key)}
                  cursor="pointer"
                  borderColor={e.key === event?.key ? 'accent.default' : 'border.subtle'}
                  borderRadius="l2"
                  borderWidth="1px"
                  py="1"
                  px="3"
                  color={e.key === event?.key ? 'accent.fg' : 'fg.muted'}
                  fontSize="sm"
                  bg={e.key === event?.key ? 'accent.default' : 'bg.default'}
                >
                  {e.tour.tourName.slice(0, 44)} · {e.tour.startDate.slice(0, 4)}
                </Box>
              ))}
            </HStack>
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
