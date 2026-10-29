const path = require('node:path');

// Some Windows installs cannot load the native SWC addon. The open source WASM
// package is a local fallback, so the normal npm scripts still work.
if (process.platform === 'win32') {
  try {
    require('@next/swc-win32-x64-msvc');
  } catch {
    process.env.NEXT_TEST_WASM = '1';
    process.env.NEXT_TEST_WASM_DIR = path.dirname(require.resolve('@next/swc-wasm-nodejs/wasm.js'));
  }
}

process.argv[1] = require.resolve('next/dist/bin/next');
require(process.argv[1]);
