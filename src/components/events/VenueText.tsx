import { join } from 'path-browserify';
import { HStack, Stack } from 'styled-system/jsx';
import { FaLocationDot } from 'react-icons/fa6';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useVenueById } from '~/hooks/useData';
import { displayVenueLocation } from '~/utils/venues';
import type { Performance } from '~/types';

const href = (path: string) => join(import.meta.env.BASE_URL, path);

export function VenueText({
  performance,
  compact = false
}: {
  performance: Performance;
  compact?: boolean;
}) {
  const venueById = useVenueById();
  const venue = performance.venueId ? venueById.get(performance.venueId) : undefined;
  const location = displayVenueLocation(venue);
  if (!performance.venue) return null;

  const name = performance.venueId ? (
    <Link
      href={href(`/venues?venue=${encodeURIComponent(performance.venueId)}`)}
      onClick={(event) => event.stopPropagation()}
    >
      {performance.venue}
    </Link>
  ) : (
    performance.venue
  );

  if (compact || !location) {
    return <>{name}</>;
  }

  return (
    <Stack gap="0.5">
      <Text>{name}</Text>
      <HStack gap="1.5" color="fg.muted" fontSize="xs">
        <FaLocationDot />
        <Text>{location}</Text>
      </HStack>
    </Stack>
  );
}
