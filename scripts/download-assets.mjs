import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/products', {recursive: true});
const photos = {headphones:'photo-1546435770-a3e426bf472b',cycle:'photo-1485965120184-e220f721d03e',laptop:'photo-1517336714731-489689fd1ca8',books:'photo-1544947950-fa07a98d237f',lamp:'photo-1507473885765-e6ed057f782c'};
await Promise.all(Object.entries(photos).map(async([name,id])=>{try{const response=await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`);if(!response.ok)throw Error(String(response.status));await writeFile(`public/products/${name}.jpg`,Buffer.from(await response.arrayBuffer()));console.log(name+' saved');}catch(e){console.error(name,e.message);process.exitCode=1;}}));
