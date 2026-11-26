import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaCopy, FaXTwitter } from 'react-icons/fa6';
import { Wrap } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { useAbbreviations } from '~/hooks/useAbbreviations';
import { useCopyText } from '~/hooks/useCopyText';
import {
  eventernoteSearchUrl,
  formatEventShareText,
  llFansEventUrl,
  xShareUrl
} from '~/utils/share';
import type { Performance } from '~/types';

export function EventShareActions({ performance }: { performance: Performance }) {
  const { t } = useTranslation();
  const copyText = useCopyText();
  const { short, ready } = useAbbreviations();
  return (
    <Wrap gap="2">
      <Button
        size="xs"
        variant="outline"
        onClick={() => void copyText(formatEventShareText(performance))}
      >
        <FaCopy />
        {t('share.copy_text')}
      </Button>
      <Button
        size="xs"
        variant="outline"
        disabled={!ready}
        onClick={() => void copyText(formatEventShareText(performance, short.event(performance)))}
      >
        <FaCopy />
        {t('share.copy_text_short')}
      </Button>
      <Button asChild size="xs" variant="outline">
        <a
          href={xShareUrl(`${formatEventShareText(performance)} #LLerNote`)}
          target="_blank"
          rel="noreferrer"
        >
          <FaXTwitter />
          {t('share.share_x')}
        </a>
      </Button>
      <Button asChild size="xs" variant="outline">
        <a href={eventernoteSearchUrl(performance)} target="_blank" rel="noreferrer">
          <FaArrowUpRightFromSquare />
          {t('share.eventernote')}
        </a>
      </Button>
      {llFansEventUrl(performance) && (
        <Button asChild size="xs" variant="outline">
          <a href={llFansEventUrl(performance)} target="_blank" rel="noreferrer">
            <FaArrowUpRightFromSquare />
            {t('share.ll_fans')}
          </a>
        </Button>
      )}
    </Wrap>
  );
}
