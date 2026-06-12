import { useTranslation } from 'react-i18next';
import { Fragment } from 'react';
import { Helmet } from 'react-helmet-async';
import { VERSION } from '../../version';
import { SITE_URL } from '~/utils/site';

export function Metadata(props: { title?: string; helmet?: boolean }) {
  const { t, i18n } = useTranslation();
  const title = props.title ?? t('title', { titlePrefix: t('defaultTitlePrefix') });
  const description = t('description');
  const siteName = t('site_name');
  const url = SITE_URL;
  const image = `${SITE_URL}assets/llernote-icon-512.png`;
  const Wrapper = props.helmet ? Helmet : Fragment;

  return (
    <Wrapper>
      <meta data-rh="true" name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>{title}</title>
      <meta data-rh="true" property="og:title" content={title} />
      <meta data-rh="true" name="twitter:title" content={title} />

      <meta data-rh="true" property="og:site_name" content={siteName} />
      <meta data-rh="true" property="og:type" content="website" />
      <meta
        data-rh="true"
        property="og:locale"
        content={i18n.language.startsWith('ja') ? 'ja_JP' : 'en_US'}
      />

      <link data-rh="true" rel="canonical" href={url} />
      <meta data-rh="true" property="og:url" content={url} />

      <meta data-rh="true" property="og:description" content={description} />
      <meta data-rh="true" name="description" content={description} />
      <meta data-rh="true" name="twitter:description" content={description} />

      <meta data-rh="true" name="version" content={VERSION} />

      <meta data-rh="true" property="og:image" content={image} />
      <meta data-rh="true" name="twitter:image" content={image} />
      <meta data-rh="true" name="twitter:card" content="summary" />
    </Wrapper>
  );
}
