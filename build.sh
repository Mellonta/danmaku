#!/bin/bash -ex

bun build ./src/index.tsx --minify --outfile ./dist/index.js
cat ./src/meta.ts ./dist/index.js > ./dist/danmu.user.js
rm ./dist/index.js