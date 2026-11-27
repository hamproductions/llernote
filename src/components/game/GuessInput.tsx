import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { fuzzySearch, getSearchScore, type SearchableItem } from '~/utils/search';

export type GuessItem = SearchableItem & {
  id: string;
  label?: string;
  sub: string;
  tag?: string;
};

export function GuessInput({
  items,
  excluded,
  placeholder,
  emptyLabel,
  lang,
  autoFocus,
  onGuess
}: {
  items: GuessItem[];
  excluded: string[];
  placeholder: string;
  emptyLabel: string;
  lang: string;
  autoFocus?: boolean;
  onGuess: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const skip = new Set(excluded);
    return items
      .filter((it) => !skip.has(it.id) && fuzzySearch(it, q))
      .sort((a, b) => getSearchScore(b, q) - getSearchScore(a, q))
      .slice(0, 30);
  }, [items, query, excluded]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (id: string | undefined) => {
    if (!id) return;
    onGuess(id);
    setQuery('');
    setOpen(false);
  };

  return (
    <Box ref={boxRef} position="relative" w="full">
      <Input
        size="lg"
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(matches[active]?.id);
          }
        }}
        lang={lang}
        borderRadius="l3"
        h="12"
        fontSize="md"
        boxShadow="0 0 22px rgba(228,0,127,0.16)"
      />
      {open && query.trim() && (
        <Stack
          zIndex="20"
          position="absolute"
          gap="0"
          borderColor="border.default"
          borderRadius="l3"
          borderWidth="1px"
          w="full"
          maxH="80"
          mt="1"
          bgColor="bg.default"
          boxShadow="xl"
          overflowY="auto"
        >
          {matches.length === 0 ? (
            <Text p="3" color="fg.muted" fontSize="sm">
              {emptyLabel}
            </Text>
          ) : (
            matches.map((m, i) => (
              <HStack
                key={m.id}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(m.id)}
                cursor="pointer"
                gap="2"
                py="2"
                px="3"
                bgColor={i === active ? 'accent.a3' : undefined}
              >
                <Stack flex="1" gap="0" minW="0">
                  <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                    {m.label ?? m.name}
                  </Text>
                  <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                    {m.sub}
                  </Text>
                </Stack>
                {m.tag && (
                  <Text flexShrink={0} color="fg.subtle" fontSize="2xs">
                    {m.tag}
                  </Text>
                )}
              </HStack>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
}
