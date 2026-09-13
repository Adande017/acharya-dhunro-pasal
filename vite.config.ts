import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * LightningCSS drops unprefixed `backdrop-filter` when it emits
 * `-webkit-backdrop-filter` only. Chromium/Firefox then report
 * computed backdrop-filter: none. Re-inject the standard property
 * after every -webkit-backdrop-filter declaration in emitted CSS.
 */
function preserveBackdropFilter(): Plugin {
  return {
    name: 'preserve-backdrop-filter',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || typeof item.source === 'undefined') continue
        if (!item.fileName.endsWith('.css')) continue
        let css = typeof item.source === 'string'
          ? item.source
          : Buffer.from(item.source).toString('utf8')
        // Insert backdrop-filter after each -webkit-backdrop-filter if missing
        css = css.replace(
          /-webkit-backdrop-filter\s*:\s*([^;}{]+)/g,
          (_full, val: string) => {
            const v = val.trim()
            return `-webkit-backdrop-filter:${v};backdrop-filter:${v}`
          },
        )
        // Collapse accidental doubles from source already having both
        css = css.replace(
          /backdrop-filter:([^;}{]+);backdrop-filter:\1/g,
          'backdrop-filter:$1',
        )
        item.source = css
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), preserveBackdropFilter()],
  base: './',
  css: {
    // Keep broad targets so LightningCSS does not assume webkit-only
    lightningcss: {
      targets: {
        chrome: 98 << 16,
        firefox: 103 << 16,
        safari: 15 << 16,
        edge: 98 << 16,
      },
    },
  },
})
