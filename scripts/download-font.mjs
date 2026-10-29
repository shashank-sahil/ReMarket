import {mkdir,writeFile,readFile} from 'node:fs/promises';
const res=await fetch('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700;750;800;850;900;950&display=swap',{headers:{'User-Agent':'Mozilla/5.0'}});
if(!res.ok)throw new Error('Font CSS '+res.status);
const css=await res.text();const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(v=>v[1]))];
await mkdir('public/fonts',{recursive:true});
let local=css;
for(const [i,url]of urls.entries()){const font=await fetch(url);if(!font.ok)throw new Error('Font download');const filename=`dm-sans-${i}.${url.includes('.woff2')?'woff2':url.includes('.ttf')?'ttf':'woff'}`;await writeFile('public/fonts/'+filename,Buffer.from(await font.arrayBuffer()));local=local.replaceAll(url,'/fonts/'+filename);}
const path='app/globals.css';const styles=await readFile(path,'utf8');await writeFile(path,styles.replace(/@import url\([^\n]+\);/,local));console.log('Saved '+urls.length+' font files locally.');
