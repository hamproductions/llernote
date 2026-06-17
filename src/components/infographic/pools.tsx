import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { TYPE, useInfo } from './shared';

export function SongChip({ s }: { s: any }) {
  const { songName, openSong } = useInfo();
  return (
    <Box
      as="button"
      onClick={() => openSong(s.id)}
      style={{ borderLeft: `3px solid ${TYPE[s.t] || TYPE.unknown}` }}
      cursor="pointer"
      borderColor="border.subtle"
      borderRadius="full"
      borderWidth="1px"
      py="0.5"
      px="2"
      fontSize="xs"
      whiteSpace="nowrap"
      _hover={{ bg: 'bg.muted', borderColor: 'accent.8' }}
    >
      {songName(s.id)}
    </Box>
  );
}

export function Cat({ label, col, arr }: { label: string; col: string; arr: any[] }) {
  const { songName, lang } = useInfo();
  return (
    <Stack gap="1.5">
      <Text
        style={{ color: col }}
        fontSize="2xs"
        fontWeight="semibold"
        letterSpacing="wide"
        textTransform="uppercase"
      >
        {label} · {arr.length}
      </Text>
      <Wrap gap="1">
        {arr.length ? (
          [...arr]
            .sort((a, b) => songName(a.id).localeCompare(songName(b.id), lang))
            .map((s, i) => <SongChip key={i} s={s} />)
        ) : (
          <Text color="fg.subtle" fontSize="xs">
            —
          </Text>
        )}
      </Wrap>
    </Stack>
  );
}

export function PoolRow({ r }: { r: any }) {
  const { t, songName, openSong } = useInfo();
  return (
    <HStack
      onClick={r.id ? () => openSong(r.id) : undefined}
      cursor={r.id ? 'pointer' : 'default'}
      gap="2"
      borderRadius="sm"
      py="0.5"
      _hover={r.id ? { bg: 'bg.muted' } : undefined}
    >
      <Box
        style={{ background: TYPE[r.t] || TYPE.unknown }}
        flexShrink={0}
        borderRadius="2px"
        w="2"
        h="2"
      />
      <Text flex="1" fontSize="xs" lineClamp={1}>
        {songName(r.id)}
      </Text>
      <Text color="fg.muted" fontSize="2xs" fontVariantNumeric="tabular-nums">
        {t('infographic.legs_count', { count: r.legs })}
      </Text>
    </HStack>
  );
}
