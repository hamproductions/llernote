import { Partytown } from '@builder.io/partytown/react';
import { Metadata } from '~/components/layout/Metadata';
import { GA_ID } from '~/utils/analytics';
import { getAssetUrl } from '~/utils/assets';

export function Head() {
  return (
    <>
      <Metadata />
      {import.meta.env.PROD && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              window.gtag = function gtag() {
                window.dataLayer.push(arguments);
              };
              `
            }}
          />
          <script
            type="text/partytown"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          ></script>
          <script
            type="text/partytown"
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag() {
                  dataLayer.push(arguments);
              }
              gtag("js", new Date());
              gtag("config", "${GA_ID}");
              `
            }}
          />
          <Partytown
            forward={['dataLayer.push']}
            lib={(import.meta.env.PUBLIC_ENV__BASE_URL ?? '') + '/~partytown/'}
          />
        </>
      )}
      <link rel="manifest" href={getAssetUrl('/manifest.webmanifest')} />
      <link rel="icon" href={getAssetUrl('/favicon.svg')} type="image/svg+xml" />
      <link rel="apple-touch-icon" href={getAssetUrl('/assets/llernote-icon-180.png')} />
      <meta name="theme-color" content="#e4007f" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Outfit:wght@400;600;800&display=swap"
        rel="stylesheet"
      />
    </>
  );
}
