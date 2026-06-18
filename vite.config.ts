import { PluginOption, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';
import { cjsInterop } from 'vite-plugin-cjs-interop';
import tsconfigPaths from 'vite-tsconfig-paths';
import { partytownVite } from '@builder.io/partytown/utils';
import { join } from 'path';
import fs from 'fs';

const ReactCompilerConfig = {};

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;
const buildTimestamp = new Date().toISOString();

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  define: {
    'import.meta.env.PUBLIC_ENV__APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.PUBLIC_ENV__BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.PUBLIC_ENV__EVENTERNOTE_API_URL': JSON.stringify(
      process.env.PUBLIC_ENV__EVENTERNOTE_API_URL ?? ''
    )
  },
  plugins: [
    tsconfigPaths(),
    partytownVite({
      dest: join(__dirname, 'dist', 'client', '~partytown')
    }),
    cjsInterop({
      dependencies: ['path-browserify', 'lz-string', 'react-helmet-async', 'file-saver']
    }),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]]
      }
    }) as PluginOption,
    ...(process.env.NODE_ENV !== 'test-preview' ? [vike()] : [])
  ],
  base: process.env.PUBLIC_ENV__BASE_URL,
  resolve: {
    alias: {
      '~': new URL('./src/', import.meta.url).pathname
    }
  },
  build: {
    sourcemap: isProduction ? 'hidden' : false,
    cssMinify: isProduction,
    minify: isProduction,
    rollupOptions: {
      output: {
        hoistTransitiveImports: false,
        manualChunks(id) {
          if (id.includes('performance-setlists.json')) return 'setlists-analysis';
          if (id.includes('/data/')) return 'data-core';
          if (id.includes('/components/events/EventDetailDialog')) return 'event-detail';
          if (id.includes('/components/songs/SongDetailDialog')) return 'song-detail';
        }
      }
    },
    commonjsOptions: {
      exclude: ['react/cjs', 'react-dom/cjs']
    }
  }
});
