#!/bin/bash -ex

rm -rf ./dist
bun build ./src/index.tsx --minify --outdir ./dist --outfile ./dist/index.js
cat ./src/meta.ts ./dist/index.js > ./dist/danmu.user.js
rm ./dist/index.js