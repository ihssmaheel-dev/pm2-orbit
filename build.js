const { build: esbuild } = require('esbuild');
const path = require('path');

async function buildUI() {
  console.log('▸ Building UI with Vite...');
  const { build } = await import('vite');
  await build({
    configFile: path.join(__dirname, 'ui/vite.config.ts'),
    root: path.join(__dirname, 'ui'),
    build: { outDir: path.join(__dirname, 'dist-ui'), emptyOutDir: true },
  });
}

async function buildServer() {
  console.log('▸ Building server with esbuild...');
  await esbuild({
    entryPoints: ['src/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/server.js',
    external: ['pm2', 'better-sqlite3'],
    minify: true,
  });
}

(async () => {
  await buildUI();
  await buildServer();
  console.log('✓ Build complete');
})().catch((e) => { console.error(e); process.exit(1); });
