import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMusic } from 'react-icons/fa6';
import { Box, Center, Stack } from 'styled-system/jsx';
import { EXPORT_THEME } from './mypick-theme';
import { Text } from '~/components/ui/text';
import { getLiveThumb, usePerformanceById } from '~/hooks/useData';
import { useSongById } from '~/hooks/useSongData';
import { useCharacters } from '~/hooks/useCharacterData';
import { getPicUrl } from '~/utils/assets';
import { localizedName } from '~/utils/names';
import type { ShortNames } from '~/utils/abbreviations';
import type { MyPickColumn } from '~/types/attendance';

function CellImage({
  src,
  dim = false,
  top = false
}: {
  src: string;
  dim?: boolean;
  top?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Box
      inset="0"
      position="absolute"
      bgColor="bg.subtle"
      opacity={dim ? 0.5 : 1}
      overflow="hidden"
    >
      {failed ? (
        <Center w="full" h="full" color="fg.subtle">
          <FaMusic />
        </Center>
      ) : (
        <img
          src={src}
          alt=""
          width="200"
          height="200"
          style={{
            objectFit: 'cover',
            objectPosition: top ? 'top' : 'center',
            width: '100%',
            height: '100%'
          }}
          onError={() => setFailed(true)}
        />
      )}
    </Box>
  );
}

export function CellContent({
  column,
  pickedId,
  exporting = false,
  short
}: {
  column: MyPickColumn;
  pickedId: string;
  exporting?: boolean;
  short?: ShortNames;
}) {
  const { i18n } = useTranslation();
  const characters = useCharacters();
  const songById = useSongById();
  const performanceById = usePerformanceById();

  if (column.type === 'member' || (column.type === 'slot' && column.slot === 'cast')) {
    const character = characters.find((c) => c.id === pickedId);
    if (!character) return null;
    const name = localizedName(i18n.language, character.fullName, character.englishName);
    return (
      <>
        <CellImage src={getPicUrl(character.id, 'character')} top />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text
            color="white"
            fontSize={exporting ? 'xs' : '2xs'}
            fontWeight="bold"
            textAlign="center"
            lineClamp={2}
          >
            {short?.name(character.fullName, name) ?? name}
          </Text>
        </Box>
      </>
    );
  }
  if (
    (column.type === 'year' && column.slot === 'song') ||
    (column.type === 'slot' && column.slot === 'song')
  ) {
    const song = songById.get(pickedId);
    if (!song) return null;
    const name = localizedName(i18n.language, song.name, song.englishName);
    return (
      <>
        <CellImage src={getPicUrl(song.id, 'thumbnail')} />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text
            color="white"
            fontSize={exporting ? 'xs' : '2xs'}
            fontWeight="bold"
            textAlign="center"
            lineClamp={2}
          >
            {short?.song(song) ?? name}
          </Text>
        </Box>
      </>
    );
  }
  const performance = performanceById.get(pickedId);
  if (!performance) return null;
  const tourName = short?.event(performance) ?? performance.tourName;
  const thumb = getLiveThumb(performance);
  if (thumb) {
    return (
      <>
        <CellImage src={thumb.image} />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text
            lang="ja"
            color="white"
            fontSize={exporting ? 'xs' : '2xs'}
            fontWeight="bold"
            textAlign="center"
            lineClamp={2}
          >
            {tourName}
          </Text>
        </Box>
      </>
    );
  }
  return (
    <Stack
      style={exporting ? { backgroundColor: EXPORT_THEME.tile, color: '#232c4a' } : undefined}
      inset="0"
      position="absolute"
      gap="2"
      justifyContent="center"
      alignItems="center"
      p="3"
      color={exporting ? undefined : 'mypick.text'}
      textAlign="center"
      bgColor={exporting ? undefined : 'mypick.tile'}
    >
      <Text
        lang="ja"
        style={{
          wordBreak: 'auto-phrase' as 'normal',
          color: exporting ? '#232c4a' : undefined
        }}
        minW="0"
        maxW="full"
        color={exporting ? undefined : 'mypick.text'}
        fontSize={exporting ? 'sm' : 'xs'}
        fontWeight="bold"
        lineHeight="1.25"
        lineClamp={4}
        overflowWrap="anywhere"
      >
        {tourName}
      </Text>
      <Text
        color="accent.default"
        fontSize={exporting ? 'xs' : '2xs'}
        fontWeight="semibold"
        lineHeight="1"
      >
        {performance.date}
      </Text>
    </Stack>
  );
}
