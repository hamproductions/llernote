import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from '~/components/utils/ErrorBoundary';
import { ColorModeProvider } from '~/context/ColorModeContext';
import { ToasterProvider } from '~/context/ToasterContext';

import '../i18n';

import '../index.css';

export function Wrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ColorModeProvider>
          <ToasterProvider>{children}</ToasterProvider>
        </ColorModeProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
