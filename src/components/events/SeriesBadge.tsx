import { Badge } from '~/components/ui/badge';
import { useSeriesById } from '~/hooks/useData';
import { getSeriesShortName } from '~/utils/series-short';

export function SeriesBadge({ seriesId, size = 'sm' }: { seriesId: string; size?: 'sm' | 'md' }) {
  const seriesById = useSeriesById();
  const series = seriesById.get(seriesId);
  if (!series) return null;

  return (
    <Badge
      style={{ backgroundColor: series.color, color: 'white' }}
      size={size}
      title={series.name}
    >
      {getSeriesShortName(seriesId, series.name)}
    </Badge>
  );
}
