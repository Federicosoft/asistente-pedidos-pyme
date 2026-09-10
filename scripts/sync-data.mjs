import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('public/data',{recursive:true});
for(const file of ['stock_productos.xlsx','precios_productos.xlsx'])await copyFile(`data/${file}`,`public/data/${file}`);
console.log('Excel sincronizados sin modificar sus valores.');
