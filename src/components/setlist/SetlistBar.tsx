import { Box, HStack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { buildSetlistFlow, sectionsOf, type SetlistFlow } from '~/utils/setlist-flow';
import type { Setlist, SetlistSection } from '~/types';

type SetlistBarProps = {
  setlist?: Setlist;
  sections?: SetlistSection[];
  flow?: SetlistFlow;
  masked?: boolean;
  h?: string | Record<string, string>;
  gap?: string;
};

export function SetlistBar({
  setlist,
  sections,
  flow,
  masked = false,
  h = '6',
  gap = '0.5'
}: SetlistBarProps) {
  const resolved = flow ?? buildSetlistFlow(setlist, sections ?? sectionsOf(setlist));
  if (resolved.runs.length === 0) return null;
  return (
    <HStack gap={gap} borderRadius="l2" h={h} overflow="hidden">
      {resolved.runs.map((r, i) => (
        <Box
          key={i}
          title={masked ? undefined : r.title}
          style={{ flexGrow: r.grow, background: r.color }}
          display="flex"
          justifyContent="center"
          alignItems="center"
          minW="1"
          h="full"
        >
          {!masked && r.songs > 1 && (
            <Text color="white" fontSize="2xs" fontWeight="bold">
              {r.songs}
            </Text>
          )}
        </Box>
      ))}
    </HStack>
  );
}
