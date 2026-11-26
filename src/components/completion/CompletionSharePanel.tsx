import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink } from 'react-icons/fa6';
import { Grid, HStack, Stack, styled } from 'styled-system/jsx';
import { CompletionCard } from './CompletionCard';
import { AbbreviateSwitch } from '~/components/export/AbbreviateSwitch';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Link } from '~/components/ui/link';
import type { useAbbreviatedExport } from '~/hooks/useAbbreviations';

export function CompletionSharePanel({
  card,
  sharePath,
  exporting,
  notice,
  exportNames,
  onSave,
  onCopy
}: {
  card: Pick<
    ComponentProps<typeof CompletionCard>,
    'title' | 'date' | 'includeRemote' | 'result' | 'color'
  >;
  sharePath: string;
  exporting: boolean;
  notice: string;
  exportNames: ReturnType<typeof useAbbreviatedExport>;
  onSave: () => void;
  onCopy: () => void;
}) {
  const { t } = useTranslation();
  const [sharingOpen, setSharingOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        aria-expanded={sharingOpen}
        aria-controls="completion-sharing"
        onClick={() => setSharingOpen((open) => !open)}
        hideFrom="lg"
        minH="11"
      >
        <FaLink />
        {t('completion.sharing')}
      </Button>
      <Stack
        id="completion-sharing"
        display={{ base: sharingOpen ? 'flex' : 'none', lg: 'flex' }}
        gap="2"
      >
        <Grid gap="2" gridTemplateColumns="minmax(0, 1fr) auto">
          <Button
            onClick={onSave}
            disabled={exporting || exportNames.pending}
            minH="11"
            color="white"
            bgColor="accent.10"
            _hover={{ bgColor: 'accent.9' }}
          >
            <FaDownload />
            {t(exporting ? 'completion.exporting' : 'completion.download')}
          </Button>
          <Button
            variant="outline"
            onClick={onCopy}
            aria-label={t('completion.copy')}
            title={t('completion.copy')}
            minH="11"
          >
            <FaLink />
          </Button>
        </Grid>
        <AbbreviateSwitch checked={exportNames.abbreviate} onChange={exportNames.setAbbreviate} />
        <HStack gap="2" justifyContent="space-between">
          <Link href={sharePath} minH="11" fontSize="sm">
            {t('completion.preview')}
          </Link>
          <Text role="status" fontSize="xs">
            {notice}
          </Text>
        </HStack>
        <styled.details onToggle={(event) => setImagePreviewOpen(event.currentTarget.open)}>
          <styled.summary
            cursor="pointer"
            display="flex"
            alignItems="center"
            minH="11"
            fontSize="sm"
          >
            {t('completion.image_preview')}
          </styled.summary>
          {imagePreviewOpen && <CompletionCard {...card} short={exportNames.exportShort} />}
        </styled.details>
        <styled.details color="fg.muted" fontSize="xs">
          <styled.summary cursor="pointer" display="flex" alignItems="center" minH="11">
            {t('completion.method_label')}
          </styled.summary>
          <Stack gap="2" pb="3">
            <Text>{t('completion.method', { date: card.date })}</Text>
            <Text>{t('completion.performance_method')}</Text>
            <Text>{t('completion.privacy')}</Text>
          </Stack>
        </styled.details>
      </Stack>
    </>
  );
}
