import { useEffect, useState } from 'react';
import { Box } from 'styled-system/jsx';
import { useLiveThumb } from '~/hooks/useData';
import { useIsLandscape } from '~/hooks/useIsLandscape';
import type { Performance } from '~/types';

export function EventThumb({
  performance,
  tourOnly = false
}: {
  performance: Performance;
  tourOnly?: boolean;
}) {
  const thumb = useLiveThumb(performance, tourOnly);
  const [failed, setFailed] = useState(false);
  // A wide logo cropped to this portrait slot keeps only its middle letters; fit it whole.
  const { landscape, imgProps } = useIsLandscape(thumb?.image);

  useEffect(() => {
    setFailed(false);
  }, [thumb?.image]);

  if (!thumb || failed) return null;

  return (
    <Box flexShrink={0} borderRadius="l2" w="12" h="16" bgColor="bg.subtle" overflow="hidden">
      <img
        src={thumb.image}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        {...imgProps}
        style={{ objectFit: landscape ? 'contain' : 'cover', width: '100%', height: '100%' }}
        onError={() => setFailed(true)}
      />
    </Box>
  );
}
