#!/usr/bin/env node
'use strict';

const mri = require('mri');
const path = require('path');
const fs = require('fs');

const args = mri(process.argv.slice(2), {
  alias: {
    port: 'p',
    theme: 't',
    'no-open': 'n',
    help: 'h',
    version: 'v',
    host: 'H',
  },
  default: {
    port: parseInt(process.env.PM2_ORBIT_PORT || '9823', 10),
    'no-open': false,
    host: '127.0.0.1',
  },
  boolean: ['no-open', 'help', 'version'],
  string: ['port', 'theme', 'host'],
});

if (args.help) {
  console.log(`
  PM2 Orbit — High-performance PM2 monitoring dashboard

  Usage:
    $ pm2-orbit [options]

  Options:
    --port, -p       Port to listen on (default: 9823)
    --host, -H       Host to bind to (default: 127.0.0.1)
    --no-open, -n    Don't open browser automatically
    --theme, -t      Force theme (dark|light|system)
    --help, -h       Show this help
    --version, -v    Show version

  Examples:
    $ pm2-orbit                    # Start on default port
    $ pm2-orbit -p 3000            # Start on port 3000
    $ pm2-orbit --host 0.0.0.0     # Allow remote access
    $ pm2-orbit --no-open          # Don't open browser
  `);
  process.exit(0);
}

if (args.version) {
  console.log(require('../package.json').version);
  process.exit(0);
}

// Check and auto-install pm2 if missing
function checkDependency(name, installCmd) {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
}

function installDependency(name, label) {
  console.log(`\n  \x1b[33m⚠\x1b[0m ${label} not found. Installing...`);
  try {
    const { execSync } = require('child_process');
    execSync(`npm install -g ${name}`, { stdio: 'inherit', timeout: 120000 });
    console.log(`  \x1b[32m✓\x1b[0m ${label} installed successfully\n`);
    return true;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m Failed to install ${label}: ${err.message}`);
    console.log(`  Please install manually: npm install -g ${name}\n`);
    return false;
  }
}

// Check dependencies
if (!checkDependency('pm2')) {
  if (!installDependency('pm2', 'PM2')) {
    process.exit(1);
  }
}

if (!checkDependency('better-sqlite3')) {
  installDependency('better-sqlite3', 'better-sqlite3 (optional, for persistence)');
}

// Set theme from CLI
if (args.theme) process.env.PM2_ORBIT_THEME = args.theme;

// Set host from CLI
if (args.host) process.env.PM2_ORBIT_HOST = args.host;

async function main() {
  const pkg = require('../package.json');
  console.log('');
  console.log('  \x1b[36mPM2 Orbit\x1b[0m v' + pkg.version);
  console.log('  \x1b[90mHigh-performance PM2 monitoring dashboard\x1b[0m');
  console.log('');

  const { createServer } = require('../dist/server');
  const server = await createServer({ port: args.port });
  await server.listen({ port: args.port, host: args.host });

  const url = `http://${args.host === '127.0.0.1' ? 'localhost' : args.host}:${args.port}`;
  console.log(`  \x1b[32m→\x1b[0m ${url}`);
  console.log('');

  if (!args['no-open']) {
    try {
      const { default: open } = await import('open');
      await open(url);
    } catch {
      // open failed — non-critical
    }
  }
}

main().catch((err) => {
  console.error('\n  \x1b[31mPM2 Orbit failed to start:\x1b[0m', err.message);
  process.exit(1);
});
