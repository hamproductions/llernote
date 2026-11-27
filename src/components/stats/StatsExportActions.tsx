import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';
import { Wrap } from 'styled-system/jsx';
import { CopySplitButton } from '~/components/export/CopySplitButton';
import { ImageMenu } from '~/components/export/ImageMenu';
import { useAttendance } from '~/hooks/useAttendance';
import { usePerformances } from '~/hooks/useData';
import { useCopyText } from '~/hooks/useCopyText';
import type { useAbbreviatedExport } from '~/hooks/useAbbreviations';
import { useToaster } from '~/context/ToasterContext';
import { downloadElementAsImage, formatEventShareText } from '~/utils/share';
import type { ShortNames } from '~/utils/abbreviations';

export function StatsExportActions({
  cardRef,
  exportNames,
  filters
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  exportNames: ReturnType<typeof useAbbreviatedExport>;
  filters: { year: string; seriesId: string; category: string; multiSeries: boolean };
}) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { records } = useAttendance();
  const performances = usePerformances();
  const copyText = useCopyText();
  const { ready, short, pending } = exportNames;

  const history = (names?: ShortNames) => {
    const performanceById = new Map(performances.map((p) => [p.id, p]));
    const { year, seriesId, category, multiSeries } = filters;
    const attended = records
      .filter((r) => r.status === 'attended')
      .map((r) => performanceById.get(r.performanceId))
      .filter((p) => p !== undefined)
      .filter((p) => {
        if (year && !p.date.startsWith(year)) return false;
        if (seriesId && !p.seriesIds.includes(seriesId)) return false;
        if (multiSeries && p.seriesIds.length < 2) return false;
        if (category && p.category !== category) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => formatEventShareText(p, names?.event(p)));
    return [t('stats.share_title'), ...attended, '', t('stats.generated_by')].join('\n');
  };

  return (
    <Wrap gap="2" alignItems="center">
      <CopySplitButton
        options={[
          {
            id: 'history',
            label: t('settings.copy_history'),
            onCopy: () => copyText(history())
          },
          {
            id: 'history-short',
            label: t('settings.copy_history_short'),
            disabled: !ready,
            onCopy: () => copyText(history(short))
          }
        ]}
      />
      <ImageMenu
        busy={pending}
        exportNames={exportNames}
        actions={[
          {
            id: 'download',
            label: t('share.download_image'),
            icon: <FaDownload />,
            onSelect: () => {
              if (!cardRef.current) return;
              void downloadElementAsImage(cardRef.current, 'llernote-stats.png').then(() =>
                toast({ title: t('share.image_generated'), type: 'success' })
              );
            }
          }
        ]}
      />
    </Wrap>
  );
}
