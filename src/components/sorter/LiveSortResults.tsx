import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink, FaRegClipboard, FaRegFileLines } from 'react-icons/fa6';
import { HStack, Stack } from 'styled-system/jsx';
import { LiveSortRankingGrid } from './LiveSortRankingGrid';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { CopySplitButton } from '~/components/export/CopySplitButton';
import { ImageMenu } from '~/components/export/ImageMenu';
import { OffscreenStage, useOffscreenCapture } from '~/components/export/useOffscreenCapture';
import { useToaster } from '~/context/ToasterContext';
import { useAbbreviatedExport } from '~/hooks/useAbbreviations';
import { canCopyImageToClipboard, copyElementImageToClipboard } from '~/utils/share-image';
import { copyTextToClipboard, downloadElementAsImage } from '~/utils/share';
import {
  encodeLiveSortResults,
  formatLiveSortText,
  liveSortShareUrl,
  shortRanking
} from '~/utils/live-sort-share';
import type { SortCandidate, SortUnit } from '~/utils/live-sort';

interface LiveSortResultsProps {
  /** Rank buckets; candidates sharing a bucket are tied. */
  ranking: SortCandidate[][];
  unit: SortUnit;
  readOnly?: boolean;
}

export function LiveSortResults({ ranking, unit, readOnly }: LiveSortResultsProps) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { abbreviate, setAbbreviate, ready, short, pending } = useAbbreviatedExport();
  const { visibleRef, cloneRef, cloneWidth, target } = useOffscreenCapture(abbreviate);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  // Resolved on mount so the button set does not change between server and client render.
  const [canCopyImage, setCanCopyImage] = useState(false);
  useEffect(() => setCanCopyImage(canCopyImageToClipboard()), []);

  const onCopyLink = async () => {
    const encoded = encodeLiveSortResults({
      unit,
      results: ranking.map((bucket) => bucket.map((candidate) => candidate.id))
    });
    await copyTextToClipboard(liveSortShareUrl(encoded));
    toast({ title: t('sort.link_copied'), type: 'success' });
  };

  const onCopyText = async (rows: SortCandidate[][], separator?: string) => {
    await copyTextToClipboard(formatLiveSortText(rows, separator));
    toast({ title: t('sort.text_copied'), type: 'success' });
  };

  const onSaveImage = async () => {
    const element = target();
    if (!element) return;
    setSaving(true);
    try {
      await downloadElementAsImage(element, 'llernote-live-ranking.png');
    } finally {
      setSaving(false);
    }
  };

  const onCopyImage = async () => {
    const element = target();
    if (!element) return;
    setCopying(true);
    try {
      await copyElementImageToClipboard(element);
      toast({ title: t('sort.image_copied'), type: 'success' });
    } catch {
      // Clipboard writes fail on a denied permission or an unfocused document; falling
      // back to a download still gets the user their image.
      await downloadElementAsImage(element, 'llernote-live-ranking.png');
    } finally {
      setCopying(false);
    }
  };

  return (
    <Stack gap="4">
      <HStack gap="2" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <SectionHeading>{t('sort.results_title')}</SectionHeading>
        {!readOnly && (
          <HStack gap="2" flexWrap="wrap">
            <CopySplitButton
              options={[
                {
                  id: 'text',
                  label: t('sort.copy_text'),
                  icon: <FaRegFileLines />,
                  onCopy: () => onCopyText(ranking)
                },
                {
                  id: 'text-short',
                  label: t('sort.copy_text_short'),
                  icon: <FaRegFileLines />,
                  disabled: !ready,
                  onCopy: () => onCopyText(shortRanking(ranking, short), ' ')
                },
                { id: 'link', label: t('sort.copy_link'), icon: <FaLink />, onCopy: onCopyLink }
              ]}
            />
            <ImageMenu
              busy={saving || copying || pending}
              exportNames={{ abbreviate, setAbbreviate }}
              actions={[
                ...(canCopyImage
                  ? [
                      {
                        id: 'copy',
                        label: t('sort.copy_image'),
                        icon: <FaRegClipboard />,
                        onSelect: () => void onCopyImage()
                      }
                    ]
                  : []),
                {
                  id: 'save',
                  label: t('sort.save_image'),
                  icon: <FaDownload />,
                  onSelect: () => void onSaveImage()
                }
              ]}
            />
          </HStack>
        )}
      </HStack>

      <LiveSortRankingGrid ref={visibleRef} ranking={ranking} />

      {!readOnly && cloneWidth > 0 && (
        <OffscreenStage width={cloneWidth}>
          <LiveSortRankingGrid ref={cloneRef} ranking={shortRanking(ranking, short)} />
        </OffscreenStage>
      )}
    </Stack>
  );
}
