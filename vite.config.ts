import { defineConfig } from 'vite';

/**
 * The deployed artifact is a single self-contained HTML file: the build's
 * JS bundle gets concatenated directly into an HTML shell, with no other
 * files shipped alongside it. Any imported binary asset (e.g. the .glb
 * decorative models) must therefore be inlined into the JS bundle as a
 * base64 data URI rather than emitted as a separate hashed file, which is
 * what Vite would otherwise do above its default 4KB inline threshold.
 */
export default defineConfig({
  // Vite doesn't recognize .glb as an asset by default, so it would try to parse it as a JS module.
  assetsInclude: ['**/*.glb'],
  build: {
    // Raised from 2MB to fit the largest imported model (a mech at ~2.1MB after texture-stripping and
    // decimation) — still comfortably inside the single-file artifact's overall size ceiling.
    assetsInlineLimit: 3 * 1024 * 1024,
  },
});
