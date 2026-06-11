import type { ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';
import { LocalStorage, useLocalStorage } from '~/hooks/useLocalStorage';

type ColorModes = 'dark' | 'light';
const ColorModeContext = createContext<{
  colorMode?: ColorModes | null;
  setColorMode?: (mode: ColorModes) => void;
}>({});

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorMode] = useLocalStorage<ColorModes>('color-mode', undefined);

  useEffect(() => {
    if (colorMode != null) {
      document.documentElement.classList.add(colorMode);
      document.documentElement.classList.remove(colorMode === 'dark' ? 'light' : 'dark');
      return;
    }
    const stored = new LocalStorage<ColorModes>('color-mode').value;
    if (stored != null) {
      setColorMode(stored);
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setColorMode('dark');
    } else {
      setColorMode('light');
    }
  }, [colorMode, setColorMode]);

  return (
    <>
      <script
        lang="js"
        dangerouslySetInnerHTML={{
          __html: `
            const savedSettings = localStorage.getItem('color-mode')
            if (savedSettings !== null) {
              document.documentElement.classList.add(savedSettings === '"dark"' ? 'dark': 'light');
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
              localStorage.setItem("color-mode", '"dark"')
            } 
          `
        }}
      />
      <ColorModeContext.Provider value={{ colorMode, setColorMode }}>
        {children}
      </ColorModeContext.Provider>
    </>
  );
}

export const useColorModeContext = () => useContext(ColorModeContext);
