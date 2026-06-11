import { Metadata } from '~/components/layout/Metadata';

export function Head() {
  return (
    <>
      <Metadata />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#e4007f" />
    </>
  );
}
