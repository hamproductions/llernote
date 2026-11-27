import { useTranslation } from 'react-i18next';
import { useToaster } from '~/context/ToasterContext';
import { copyTextToClipboard } from '~/utils/share';

export const useCopyText = () => {
  const { t } = useTranslation();
  const { toast } = useToaster();
  return async (text: string) => {
    try {
      await copyTextToClipboard(text);
      toast({ title: t('share.copied'), type: 'success' });
    } catch {
      toast({ title: t('share.copy_failed'), type: 'error' });
    }
  };
};
