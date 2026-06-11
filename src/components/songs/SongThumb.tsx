import { useState } from 'react';
import { FaMusic } from 'react-icons/fa6';
import { Box, Center } from 'styled-system/jsx';
import { getPicUrl } from '~/utils/assets';

export function SongThumb({
  songId,
  size = '11',
  rounded = 'l1',
  dim = false
}: {
  songId: string;
  size?: '11' | '12' | '16';
  rounded?: 'l1' | 'l2' | 'full';
  dim?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Box
      flexShrink={0}
      borderRadius={rounded}
      w={size}
      h={size}
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
