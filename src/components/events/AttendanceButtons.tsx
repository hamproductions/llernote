import { useTranslation } from 'react-i18next';
import { FaCheck, FaPlus, FaStar } from 'react-icons/fa6';
import { Button } from '~/components/ui/button';
import { useAttendance } from '~/hooks/useAttendance';

export function AttendanceButtons({
  performanceId,
  future = false,
  size = 'xs'
}: {
  performanceId: string;
  future?: boolean;
  size?: 'xs' | 'sm' | 'md';
}) {
  const { t } = useTranslation();
  const { get, setAttendance, removeAttendance } = useAttendance();
  const record = get(performanceId);

  if (future) {
    const going = record?.status === 'interested';
    return (
      <Button
        size={size}
        variant={going ? 'solid' : 'outline'}
        title={going ? t('events.unmark') : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (going) removeAttendance(performanceId);
          else setAttendance(performanceId, 'interested');
        }}
        colorPalette="amber"
      >
        {going ? <FaStar /> : <FaPlus />}
        {going ? t('events.status_going') : t('events.mark_interested')}
      </Button>
    );
  }

  const attended = record?.status === 'attended';
  return (
    <Button
      size={size}
      variant={attended ? 'solid' : 'outline'}
      title={attended ? t('events.unmark') : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (attended) removeAttendance(performanceId);
        else setAttendance(performanceId, 'attended');
      }}
    >
      {attended ? <FaCheck /> : <FaPlus />}
      {attended ? t('events.status_attended') : t('events.mark_attended')}
    </Button>
  );
}
