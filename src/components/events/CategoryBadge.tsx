import { useTranslation } from 'react-i18next';
import { FaLocationDot, FaTv, FaWifi } from 'react-icons/fa6';
import { Badge } from '~/components/ui/badge';
import type { EventCategory, Performance } from '~/types';

const ICONS = { live: FaLocationDot, online: FaWifi, tv: FaTv } as const;

export function CategoryBadge({
  category,
  tourType
}: {
  category: EventCategory;
  tourType?: string;
}) {
  const { t } = useTranslation();
  const Icon = ICONS[category];
  return (
    <Badge size="sm" variant="subtle" title={t(`events.category_${category}`)}>
      <Icon />
      {tourType ?? t(`events.category_${category}`)}
    </Badge>
  );
}

export function PerformanceTypeBadge({ performance }: { performance: Performance }) {
  return <CategoryBadge category={performance.category} tourType={performance.tourType} />;
}
