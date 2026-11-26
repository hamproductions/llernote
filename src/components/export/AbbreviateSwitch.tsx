import { useTranslation } from 'react-i18next';
import { Switch } from '~/components/ui/switch';

export function AbbreviateSwitch({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Switch size="sm" checked={checked} onCheckedChange={(e) => onChange(e.checked)}>
      {t('share.abbreviate_image')}
    </Switch>
  );
}
