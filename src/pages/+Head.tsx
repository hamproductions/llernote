import { Metadata } from '~/components/layout/Metadata';

export function Head() {
  return (
    <>
      <Metadata />
      <link rel="manifest" href="/manifest.webmanifest" />
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
