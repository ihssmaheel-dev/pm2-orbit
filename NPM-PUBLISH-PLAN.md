# PM2 Orbit — npm Publishing Plan

## Goal
One command install. Zero config. Works everywhere.

```bash
npm install -g pm2-orbit
pm2-orbit
```

## Current State
- `bin/pm2-orbit.js` — CLI entry point ✅
- `build.js` — Builds UI (Vite) + Server (esbuild) ✅
- `package.json` has `bin.pm2-orbit` field ✅
- `.npmignore` excludes source files ✅
- `files` field limits npm package to `dist/` and `bin/` ✅

## What Needs to Happen

### 1. Prepublish Build Script
**File:** `package.json`
**Action:** Add `prepublishOnly` script that runs `npm run build` before publishing. This ensures the `dist/` and `dist-ui/` folders are always fresh when publishing.

```json
"scripts": {
  "prepublishOnly": "npm run build"
}
```

### 2. Auto-Install PM2 on First Run
**File:** `bin/pm2-orbit.js`
**Problem:** If user doesn't have pm2 installed globally, the tool fails silently.
**Fix:** Check if pm2 is available on startup. If not, prompt to install it automatically.

```js
// At top of main()
try {
  require.resolve('pm2');
} catch {
  console.log('  PM2 not found. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install -g pm2', { stdio: 'inherit' });
}
```

### 3. Auto-Install better-sqlite3
**File:** `bin/pm2-orbit.js`
**Problem:** better-sqlite3 is optional but needed for persistence.
**Fix:** Same pattern — check and prompt install.

### 4. Improve CLI UX
**File:** `bin/pm2-orbit.js`
**Changes:**
- Add colored startup banner
- Show version on startup
- Show "Opening browser..." message
- Handle port-in-use error gracefully
- Add `--host` flag for remote access

### 5. Update .npmignore
**File:** `.npmignore`
**Action:** Exclude more files to reduce package size:
```
ui/
src/
test-servers/
.git/
node_modules/
dist-ui/
*.md
.husky/
ecosystem.config.js
.github/
Dockerfile
docker-compose.yml
.dockerignore
.editorconfig
.env*
PRODUCTION-PLAN.md
```

### 6. Add prepublishOnly to Ensure Build
**File:** `package.json`
```json
"scripts": {
  "prepublishOnly": "npm run build",
  "postinstall": "node -e \"try{require.resolve('pm2')}catch{console.log('\\n  Install pm2: npm install -g pm2\\n')}\""
}
```

### 7. Update README for npm
**File:** `README.md`
**Sections needed:**
- One-line install command
- Quick start (3 steps)
- CLI options table
- Environment variables table
- Docker usage
- Features list
- Screenshot/GIF placeholder
- License

### 8. Create .npmrc for Publishing
**File:** `.npmrc` (new)
```
access=public
```

### 9. Version Strategy
- Start at `1.0.0` for first npm publish
- Use `npm version patch/minor/major` for releases
- Git tag triggers CI publish

### 10. CI/CD Publish Workflow
**File:** `.github/workflows/publish.yml` (new)
```yaml
name: Publish
on:
  push:
    tags:
      - 'v*'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 11. Test Package Locally
Before publishing, test the package locally:
```bash
# Build
npm run build

# Pack (creates tarball without publishing)
npm pack

# Test install from tarball
npm install -g pm2-orbit-1.0.0.tgz

# Test CLI
pm2-orbit --version
pm2-orbit --port 3000

# Clean up
npm uninstall -g pm2-orbit
```

### 12. Verify dist/ Contents
After build, ensure these exist:
```
dist/
  server.js          (bundled backend)
dist-ui/
  index.html         (built React SPA)
  assets/
    *.js             (chunked JS)
    *.css            (styles)
bin/
  pm2-orbit.js       (CLI entry)
package.json         (with bin field)
```

## Implementation Order

1. Update `package.json` — add `prepublishOnly`, `postinstall`
2. Update `bin/pm2-orbit.js` — auto-install pm2/sqlite, better UX
3. Update `.npmignore` — exclude more files
4. Update `README.md` — npm-focused documentation
5. Create `.github/workflows/publish.yml`
6. Test locally with `npm pack` + global install
7. Publish to npm

## Package Size Target
- Current: ~200KB (dist + dist-ui + bin + package.json)
- Goal: < 500KB gzipped
- Exclude: source maps in production build

## Post-Publish Verification
```bash
# On a fresh machine with Node 18+
npx pm2-orbit
# Should: install pm2 if missing, start server, open browser
```
