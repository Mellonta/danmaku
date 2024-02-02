#!/bin/bash -ex

bun build ./src/index.jsx --minify --outfile ./dist/index.js
cat ./src/meta.js ./dist/index.js > ./dist/danmu.user.js