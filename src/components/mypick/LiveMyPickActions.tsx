import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink, FaRotateLeft } from 'react-icons/fa6';
import { Button } from '~/components/ui/button';
import { AbbreviateSwitch } from '~/components/export/AbbreviateSwitch';

const SECONDARY = {
  variant: 'outline',
  gap: '2',
  borderColor: 'mypick.actionBorder',
  color: 'mypick.text',
  bgColor: 'mypick.actionMuted'
} as const;

export function LiveMyPickActions({
  abbreviate,
  onAbbreviateChange,
  downloadDisabled,
  onShare,
  onDownload,
  onReset
}: {
  abbreviate: boolean;
  onAbbreviateChange: (abbreviate: boolean) => void;
  downloadDisabled: boolean;
  onShare: () => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button onClick={onShare} {...SECONDARY}>
        <FaLink /> {t('mypick_live.share_url')}
      </Button>
      <AbbreviateSwitch checked={abbreviate} onChange={onAbbreviateChange} />
      <Button onClick={onDownload} disabled={downloadDisabled} {...SECONDARY}>
        <FaDownload /> {t('mypick_live.download_image')}
      </Button>
      <Button onClick={onReset} {...SECONDARY}>
        <FaRotateLeft /> {t('mypick_live.reset')}
      </Button>
    </>
  );
}
