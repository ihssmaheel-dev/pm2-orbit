const { build: esbuild } = require('esbuild');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function buildUI() {
  // Install UI dependencies if node_modules doesn't exist
  const uiNodeModules = path.join(__dirname, 'ui', 'node_modules');
  if (!fs.existsSync(uiNodeModules)) {
    console.log('▸ Installing UI dependencies...');
    execSync('npm install', { cwd: path.join(__dirname, 'ui'), stdio: 'inherit' });
  }

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
    target: 'node18',
    outfile: 'dist/server.js',
    external: ['pm2', 'better-sqlite3'],
    minify: true,
    sourcemap: false,
  });
}

(async () => {
  await buildUI();
  await buildServer();
  console.log('✓ Build complete');
})().catch((e) => { console.error(e); process.exit(1); });
