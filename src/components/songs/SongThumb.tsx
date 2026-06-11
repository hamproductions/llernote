import { useState } from 'react';
import { FaMusic } from 'react-icons/fa6';
import { Box, Center } from 'styled-system/jsx';
import { getPicUrl } from '~/utils/assets';

export function SongThumb({
  songId,
  large = false,
  dim = false
}: {
  songId: string;
  large?: boolean;
  dim?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Box
      flexShrink={0}
      borderRadius={large ? 'l2' : 'l1'}
      w={large ? '16' : '11'}
      h={large ? '16' : '11'}
      bgColor="bg.subtle"
      opacity={dim ? 0.55 : 1}
      overflow="hidden"
      filter={dim ? 'grayscale(1)' : undefined}
    >
      {failed ? (
        <Center w="full" h="full" color="fg.subtle">
          <FaMusic />
        </Center>
      ) : (
        <img
          src={getPicUrl(songId, 'thumbnail')}
          alt=""
          loading="lazy"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      )}
    </Box>
  );
}
