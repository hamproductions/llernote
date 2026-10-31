import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type * as Sentry from '@sentry/browser';
import { onFirstInteraction } from '~/utils/idle';

export const SentryContext = createContext<typeof Sentry | undefined>(undefined);

export function SentryProvider({ children }: { children: ReactNode }) {
  const [sentryInstance, setSentryInstance] = useState<typeof Sentry>();

  useEffect(() => {
    const initSentry = async () => {
      const sentry = await import('@sentry/browser');

      sentry.init({
        dsn: 'https://a5dc5c621a7a438ab0c6c67d45a82d6b@error-tracking.ham-san.net/5'
      });

      setSentryInstance(sentry);
    };

    onFirstInteraction(() => void initSentry());
  }, []);
  return <SentryContext.Provider value={sentryInstance}>{children}</SentryContext.Provider>;
}

export const useSentry = () => useContext(SentryContext);
