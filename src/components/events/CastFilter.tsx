import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Badge } from '~/components/ui/badge';
import { useCharacters } from '~/hooks/useData';
import { foldKana } from '~/utils/event-filter';
import { getPicUrl } from '~/utils/assets';
import { localizedName } from '~/utils/names';

export function CastFilter({
  selectedIds,
  onChange
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const characters = useCharacters();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selected = selectedIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  const suggestions = useMemo(() => {
    const q = foldKana(query.trim());
    return characters
      .filter((c) => !selectedIds.includes(c.id))
      .filter((c) => {
        if (!q) return true;
        return foldKana(
          `${c.fullName} ${c.englishName ?? ''} ${c.casts.map((cast) => `${cast.seiyuu} ${cast.englishName ?? ''}`).join(' ')}`
        ).includes(q);
      })
      .slice(0, 8);
  }, [characters, query, selectedIds]);

  return (
    <Stack position="relative" flex="1" gap="1" minW="48" maxW="72">
      <Input
        size="sm"
        value={query}
        placeholder={t('events.cast_placeholder')}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          clearTimeout(blurTimer.current);
          setFocused(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setFocused(false), 150);
        }}
      />
      {focused && suggestions.length > 0 && (
        <Stack
          zIndex="10"
          position="absolute"
          top="100%"
          left="0"
          right="0"
          gap="0"
          borderColor="border.default"
          borderRadius="l2"
          borderWidth="1px"
          maxH="64"
          mt="1"
          bgColor="bg.default"
          boxShadow="lg"
          overflow="hidden"
          overflowY="auto"
        >
          {suggestions.map((c) => (
            <HStack
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange([...selectedIds, c.id]);
                setQuery('');
              }}
              cursor="pointer"
              gap="2"
              py="1.5"
              px="2"
              _hover={{ bgColor: 'bg.subtle' }}
            >
              <Box
                flexShrink={0}
                borderRadius="full"
                w="7"
                h="7"
                bgColor="bg.subtle"
                overflow="hidden"
              >
                <img
                  src={getPicUrl(c.id, c.hasIcon ? 'icons' : 'character')}
                  alt=""
                  loading="lazy"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </Box>
              <Stack gap="0" minW="0">
                <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
                  {localizedName(i18n.language, c.fullName, c.englishName)}
                </Text>
                <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                  {c.casts
                    .map((cast) => localizedName(i18n.language, cast.seiyuu, cast.englishName))
                    .join('・')}
                </Text>
              </Stack>
            </HStack>
          ))}
        </Stack>
      )}
      {selected.length > 0 && (
        <Wrap gap="1">
          {selected.map((c) => (
            <Badge
              key={c.id}
              size="sm"
              variant="solid"
              onClick={() => onChange(selectedIds.filter((id) => id !== c.id))}
              cursor="pointer"
            >
              {localizedName(i18n.language, c.fullName, c.englishName)}
              <FaXmark size={10} />
            </Badge>
          ))}
        </Wrap>
      )}
    </Stack>
  );
}
