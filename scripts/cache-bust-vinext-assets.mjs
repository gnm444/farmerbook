import { readdir, readFile, writeFile } from "node:fs/promises";

const assetVersion = process.env.FARMERBOOK_ASSET_VERSION ?? Date.now().toString(36);
const manifestPaths = [
  "dist/server/__vite_rsc_assets_manifest.js",
  "dist/server/ssr/__vite_rsc_assets_manifest.js",
];
const assetReference = /\/assets\/([A-Za-z0-9._-]+\.(?:js|css))(?!\?)/g;
const relativeModuleReference = /((?:from\s*|import\s*\(\s*)["'`])(\.[^"'`]+\.js)(["'`])/g;

for (const manifestPath of manifestPaths) {
  const source = await readFile(manifestPath, "utf8");
  const cacheBusted = source.replace(
    assetReference,
    `/assets/$1?v=${assetVersion}`,
  );

  if (cacheBusted !== source) {
    await writeFile(manifestPath, cacheBusted);
  }
}

for (const filename of await readdir("dist/client/assets")) {
  if (!filename.endsWith(".js")) continue;

  const assetPath = `dist/client/assets/${filename}`;
  const source = await readFile(assetPath, "utf8");
  const cacheBusted = source.replace(
    relativeModuleReference,
    `$1$2?v=${assetVersion}$3`,
  );

  if (cacheBusted !== source) {
    await writeFile(assetPath, cacheBusted);
  }
}

console.log(`Cache-busted generated asset references with version ${assetVersion}`);
