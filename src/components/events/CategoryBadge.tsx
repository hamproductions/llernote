import { useTranslation } from 'react-i18next';
import { FaLocationDot, FaTv, FaWifi } from 'react-icons/fa6';
import { Badge } from '~/components/ui/badge';
import type { EventCategory, Performance } from '~/types';

const ICONS = { live: FaLocationDot, online: FaWifi, tv: FaTv } as const;

const TOUR_TYPE_EN: Record<string, string> = {
  'ライブ・ファンミ': 'Live / Fanmeeting',
  外部のフェス: 'External festival',
  TV出演: 'TV appearance',
  'リリイベ・ミニライブ': 'Release event',
  外部イベント内のライブ: 'Live at external event',
  バーチャルライブ: 'Virtual live',
  有観客バーチャルライブ: 'Virtual live (audience)',
  収録配信: 'Recorded broadcast'
};

export function CategoryBadge({
  category,
  tourType
}: {
  category: EventCategory;
  tourType?: string;
}) {
  const { t, i18n } = useTranslation();
  const Icon = ICONS[category];
  const label =
    tourType !== undefined
      ? i18n.language.startsWith('en')
        ? (TOUR_TYPE_EN[tourType] ?? tourType)
        : tourType
      : t(`events.category_${category}`);
  return (
    <Badge size="sm" variant="subtle" title={t(`events.category_${category}`)}>
      <Icon />
      {label}
    </Badge>
  );
}

export function PerformanceTypeBadge({ performance }: { performance: Performance }) {
  return <CategoryBadge category={performance.category} tourType={performance.tourType} />;
}
