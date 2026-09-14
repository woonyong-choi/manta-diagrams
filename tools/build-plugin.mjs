import {build} from 'esbuild';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {themeCSS} from '../src/svg.mjs';
import {bundledNotices} from './notices.mjs';
const result = await build({entryPoints:['src/main.mjs'], bundle:true, outfile:'main.js', format:'cjs', platform:'browser',
  external:['obsidian'], target:'es2022', minify:true, legalComments:'inline', logLevel:'info',write:false,metafile:true});
const notices=await bundledNotices(result.metafile.inputs);
await mkdir('docs',{recursive:true});
await writeFile('docs/third-party-notices.txt',notices);
await writeFile('main.js','/*!\n'+notices.replaceAll('*/','* /')+'*/\n'+result.outputFiles[0].text);
await writeFile('styles.css', themeCSS + '\n' + await readFile('src/plugin.css','utf8'));
