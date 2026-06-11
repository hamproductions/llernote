import { useTranslation } from 'react-i18next';
import { FaCheck, FaPlus, FaStar } from 'react-icons/fa6';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';
import { useAttendance } from '~/hooks/useAttendance';

export function AttendanceButtons({
  performanceId,
  future = false,
  size = 'xs',
  iconOnly = false
}: {
  performanceId: string;
  future?: boolean;
  size?: 'xs' | 'sm' | 'md';
  iconOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { get, setAttendance, removeAttendance } = useAttendance();
  const record = get(performanceId);

  const active = future ? record?.status === 'interested' : record?.status === 'attended';
  const label = future
    ? active
      ? t('events.status_going')
      : t('events.mark_interested')
    : active
      ? t('events.status_attended')
      : t('events.mark_attended');
  const icon = future ? active ? <FaStar /> : <FaPlus /> : active ? <FaCheck /> : <FaPlus />;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (active) removeAttendance(performanceId);
    else setAttendance(performanceId, future ? 'interested' : 'attended');
  };

  if (iconOnly) {
    return (
      <IconButton
        size={size}
        variant={active ? 'solid' : 'outline'}
        aria-label={label}
        title={active ? t('events.unmark') : label}
        onClick={onClick}
        colorPalette={future ? 'amber' : undefined}
      >
        {icon}
      </IconButton>
    );
  }

  return (
    <Button
      size={size}
      variant={active ? 'solid' : 'outline'}
      title={active ? t('events.unmark') : undefined}
      onClick={onClick}
      colorPalette={future ? 'amber' : undefined}
    >
      {icon}
      {label}
    </Button>
  );
}
