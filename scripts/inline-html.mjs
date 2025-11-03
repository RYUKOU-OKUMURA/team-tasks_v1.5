import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const htmlPath = join(distDir, 'index.html');
const inlinePath = join(distDir, 'index-inline.html');

async function ensureFileExists(path) {
  try {
    await access(path, constants.F_OK);
  } catch (err) {
    throw new Error(`Missing required file: ${path}`);
  }
}

async function buildInlineHtml() {
  await ensureFileExists(htmlPath);

  let html = await readFile(htmlPath, 'utf8');

  // Drop placeholder stylesheet that is not emitted by the build.
  html = html.replace(/<link rel="stylesheet" href="\/index.css">\s*/g, '');

  // Apps Script HtmlService does not support import maps; remove them.
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/gi, '');

  const scriptTagRegex = /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i;
  const scriptMatch = html.match(scriptTagRegex);

  if (!scriptMatch) {
    throw new Error('Unable to locate the module script in dist/index.html');
  }

  const scriptSrc = scriptMatch[1].replace(/^\//, '');
  const assetPath = join(distDir, scriptSrc);

  await ensureFileExists(assetPath);
  const bundle = await readFile(assetPath, 'utf8');
  const scriptJson = JSON.stringify(bundle);
  const inlineScript = `<script>
(function(){
  const script = document.createElement('script');
  script.type = 'module';
  script.text = ${scriptJson};
  document.currentScript.replaceWith(script);
})();
</script>`;
  html = html.replace(scriptTagRegex, () => inlineScript);

  await writeFile(inlinePath, html, 'utf8');
  console.log(`Created ${inlinePath}`);
}

buildInlineHtml().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
