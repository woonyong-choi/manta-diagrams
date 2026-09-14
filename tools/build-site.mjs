import {build} from 'esbuild';
import {mkdir, copyFile, writeFile, readFile} from 'node:fs/promises';
import {themeCSS} from '../src/svg.mjs';
await mkdir('dist/try', {recursive:true});
await build({entryPoints:['site/try/main.mjs'],bundle:true,outfile:'dist/try/main.js',format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',logLevel:'info'});
await copyFile('site/try/index.html','dist/try/index.html');
await copyFile('site/style.css','dist/style.css');
await writeFile('dist/try/viewer.css', themeCSS + '\n' + await readFile('src/plugin.css','utf8'));
// Product pages are generated from one set of reviewed product copy.
const {buildPages, products} = await import('../site/pages.mjs');
if (process.env.SITE_LOCAL_MEDIA === '1') {
  for (const product of products) {
    const dir = `dist/media/${product.repo}`;
    await mkdir(dir, {recursive:true});
    for (const file of [product.poster, product.media+'.mp4', product.media+'.gif']) {
      await copyFile(`../${product.repo}/${file}`, `${dir}/${file.split('/').at(-1)}`);
    }
  }
}
await buildPages();
