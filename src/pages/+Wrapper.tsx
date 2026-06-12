import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from '~/components/utils/ErrorBoundary';
import { SentryProvider } from '~/components/utils/SentryContext';
import { ColorModeProvider } from '~/context/ColorModeContext';
import { ToasterProvider } from '~/context/ToasterContext';
import { getAssetUrl } from '~/utils/assets';

import i18n from '../i18n';

import '../index.css';

export function Wrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(getAssetUrl('/sw.js'));
    }
    const saved =
      localStorage.getItem('i18nextLng') ?? (navigator.language.startsWith('ja') ? 'ja' : 'en');
    if (saved !== i18n.language) {
      void i18n.changeLanguage(saved);
    }
    const persist = (lng: string) => localStorage.setItem('i18nextLng', lng);
    i18n.on('languageChanged', persist);
    return () => {
      i18n.off('languageChanged', persist);
    };
  }, []);

  return (
    <HelmetProvider>
      <SentryProvider>
        <ErrorBoundary>
          <ColorModeProvider>
            <ToasterProvider>{children}</ToasterProvider>
          </ColorModeProvider>
        </ErrorBoundary>
      </SentryProvider>
    </HelmetProvider>
  );
}
