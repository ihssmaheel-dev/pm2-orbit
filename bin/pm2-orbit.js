#!/usr/bin/env node
'use strict';

const mri = require('mri');
const { createServer } = require('../dist/server');

const args = mri(process.argv.slice(2), {
  alias: {
    port: 'p',
    theme: 't',
    'no-open': 'n',
    help: 'h',
    version: 'v',
  },
  default: {
    port: parseInt(process.env.PM2_ORBIT_PORT || '9823', 10),
    'no-open': false,
  },
  boolean: ['no-open', 'help', 'version'],
  string: ['port', 'theme'],
});

if (args.help) {
  console.log(`
  PM2 Orbit — High-performance PM2 monitoring dashboard

  Usage:
    $ pm2-orbit [options]

  Options:
    --port, -p       Port to listen on (default: 9823)
    --no-open, -n    Don't open browser automatically
    --theme, -t      Force theme (dark|light|system)
    --help, -h       Show this help
    --version, -v    Show version
  `);
  process.exit(0);
}

if (args.version) {
  console.log(require('../package.json').version);
  process.exit(0);
}

if (args.theme) process.env.PM2_ORBIT_THEME = args.theme;

async function main() {
  const server = await createServer({ port: args.port });
  await server.listen({ port: args.port, host: '127.0.0.1' });
  if (!args['no-open']) {
    const { default: open } = await import('open');
    await open(`http://localhost:${args.port}`);
  }
}

main().catch((err) => {
  console.error('PM2 Orbit failed to start:', err.message);
  process.exit(1);
});
