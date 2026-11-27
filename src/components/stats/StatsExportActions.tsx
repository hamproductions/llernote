import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaDownload } from 'react-icons/fa6';
import { Wrap } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { AbbreviateSwitch } from '~/components/export/AbbreviateSwitch';
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
  const { abbreviate, setAbbreviate, ready, short, pending } = exportNames;

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
      <AbbreviateSwitch checked={abbreviate} onChange={setAbbreviate} />
      <Button
        size="sm"
        disabled={pending}
        onClick={async () => {
          if (cardRef.current) {
            await downloadElementAsImage(cardRef.current, 'llernote-stats.png');
            toast({ title: t('share.image_generated'), type: 'success' });
          }
        }}
      >
        <FaDownload />
        {t('share.download_image')}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void copyText(history())}>
        <FaCopy />
        {t('settings.copy_history')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!ready}
        onClick={() => void copyText(history(short))}
      >
        <FaCopy />
        {t('settings.copy_history_short')}
      </Button>
    </Wrap>
  );
}
