import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink, FaRotateLeft } from 'react-icons/fa6';
import { Button } from '~/components/ui/button';
import { ImageMenu } from '~/components/export/ImageMenu';

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
      <ImageMenu
        busy={downloadDisabled}
        exportNames={{ abbreviate, setAbbreviate: onAbbreviateChange }}
        actions={[
          {
            id: 'download',
            label: t('mypick_live.download_image'),
            icon: <FaDownload />,
            onSelect: onDownload
          }
        ]}
        size="md"
        {...SECONDARY}
      />
      <Button onClick={onReset} {...SECONDARY}>
        <FaRotateLeft /> {t('mypick_live.reset')}
      </Button>
    </>
  );
}
