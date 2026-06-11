import { useTranslation } from 'react-i18next';
import { FaRegStar, FaStar, FaCheck } from 'react-icons/fa6';
import { Button } from '~/components/ui/button';
import { useAttendance } from '~/hooks/useAttendance';

export function AttendanceButtons({
  performanceId,
  size = 'xs'
}: {
  performanceId: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const { t } = useTranslation();
  const { get, setAttendance, removeAttendance } = useAttendance();
  const record = get(performanceId);

  return (
    <>
      <Button
        size={size}
        variant={record?.status === 'attended' ? 'solid' : 'outline'}
        onClick={(e) => {
          e.stopPropagation();
          record?.status === 'attended'
            ? removeAttendance(performanceId)
            : setAttendance(performanceId, 'attended');
        }}
      >
        <FaCheck />
        {t('events.status_attended')}
      </Button>
      <Button
        size={size}
        variant={record?.status === 'interested' ? 'solid' : 'outline'}
        onClick={(e) => {
          e.stopPropagation();
          record?.status === 'interested'
            ? removeAttendance(performanceId)
            : setAttendance(performanceId, 'interested');
        }}
        colorPalette="amber"
      >
        {record?.status === 'interested' ? <FaStar /> : <FaRegStar />}
        {t('events.status_interested')}
      </Button>
    </>
  );
}
