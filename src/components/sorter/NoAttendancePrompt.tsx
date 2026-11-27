import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { join } from 'path-browserify';
import { FaArrowRight, FaCloudArrowDown } from 'react-icons/fa6';
import { HStack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';

const EventernoteImportDialog = lazy(() =>
  import('~/components/eventernote/EventernoteImportDialog').then((module) => ({
    default: module.EventernoteImportDialog
  }))
);

export function NoAttendancePrompt() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <Card.Root>
      <Card.Body gap="3" p="5">
        <Text fontWeight="bold">{t('sort.no_attended_title')}</Text>
        <Text color="fg.muted" fontSize="sm">
          {t('sort.no_attended_text')}
        </Text>
        <HStack gap="2" flexWrap="wrap">
          <Button
            size="sm"
            onClick={() => {
              setMounted(true);
              setOpen(true);
            }}
          >
            <FaCloudArrowDown />
            {t('eventernote.import_from')}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={join(import.meta.env.BASE_URL, '/events')}>
              {t('sort.register_events')}
              <FaArrowRight />
            </a>
          </Button>
        </HStack>
      </Card.Body>
      {mounted && (
        <Suspense fallback={null}>
          <EventernoteImportDialog open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Card.Root>
  );
}
