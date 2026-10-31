import { Metadata } from '~/components/layout/Metadata';
import { getAssetUrl } from '~/utils/assets';

export function Head() {
  return (
    <>
      <Metadata />
      <link rel="manifest" href={getAssetUrl('/manifest.webmanifest')} />
      <link rel="icon" href={getAssetUrl('/favicon.svg')} type="image/svg+xml" />
      <link rel="apple-touch-icon" href={getAssetUrl('/assets/llernote-icon-180.png')} />
      <meta name="theme-color" content="#e4007f" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Outfit:wght@400;600;800&display=optional"
        rel="stylesheet"
        media="print"
        data-font="1"
      />
      <noscript>
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Outfit:wght@400;600;800&display=optional"
          rel="stylesheet"
        />
      </noscript>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var l=document.querySelector('link[data-font=\"1\"]');if(!l)return;if(l.sheet){l.media='all';}else{l.addEventListener('load',function(){l.media='all';});}})();"
        }}
      />
    </>
  );
}
