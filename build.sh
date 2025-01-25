#!/bin/bash -ex

rm -rf ./dist
cp ./src/dandanplay.ts ./dandanplay.ts
source key.sh
sed -i '' "s|const AppId = \"<ENTER_APP_ID>\";|${APP_ID}|g" ./src/dandanplay.ts
sed -i '' "s|const AppSecret = \"<ENTER_APP_SECRET>\";|${APP_SECRET}|g" ./src/dandanplay.ts
bun build ./src/index.tsx --minify --outdir ./dist --outfile ./dist/index.js
cat ./src/meta.ts ./dist/index.js > ./dist/danmu.user.js
rm ./dist/index.js
mv ./dandanplay.ts ./src/dandanplay.ts