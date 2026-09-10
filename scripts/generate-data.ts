import * as XLSX from 'xlsx';
import fs from 'node:fs';
import {catalog} from '../data/catalog';
const supplies=[{available:120,reserved:10},{available:500,reserved:30},{available:17,reserved:5},{available:42,reserved:10},{available:0,reserved:0},{available:8,reserved:2},{available:12,reserved:0},{available:90,reserved:10},{available:20,reserved:0},{available:250,reserved:30},{available:0,reserved:0},{available:8,reserved:2},{available:40,reserved:0},{available:75,reserved:10},{available:19,reserved:0},{available:180,reserved:15},{available:9,reserved:1},{available:130,reserved:5},{available:18,reserved:0},{available:250,reserved:10}];
const prices=[12500,9400,285000,15800,23000,196000,245000,18900,23700,32500,null,88000,36000,57000,49000,17200,210000,19400,41000,15700];
const today=new Date();today.setUTCHours(0,0,0,0);
const shift=(days:number)=>new Date(today.getTime()+days*86400000);
const stock=catalog.map((p,i)=>({SKU:p.sku,Producto:p.name,'Categoría':p.category,'Stock disponible':supplies[i].available,'Stock reservado':supplies[i].reserved,'Stock utilizable':supplies[i].available-supplies[i].reserved,'Fecha actualización':today}));
const price=catalog.map((p,i)=>({SKU:p.sku,Producto:p.name,Precio:prices[i],Moneda:'ARS','IVA incluido':i===1||i===3,'Fecha desde':shift(-30),'Fecha hasta':shift(i===7?-1:365),Lista:'Lista General'}));
for(const [name,values] of [['stock_productos',stock],['precios_productos',price]] as const){
 const w=XLSX.utils.book_new();const sheet=XLSX.utils.json_to_sheet(values,{cellDates:true});sheet['!cols']=name==='stock_productos'?[{wch:14},{wch:44},{wch:26},{wch:20},{wch:20},{wch:20},{wch:22}]:[{wch:14},{wch:44},{wch:18},{wch:12},{wch:16},{wch:18},{wch:18},{wch:20}];sheet['!autofilter']={ref:sheet['!ref']!};sheet['!rows']=Array.from({length:21},()=>({hpt:24}));
 for(let row=2;row<=21;row++){
  if(name==='stock_productos'){sheet[`F${row}`].f=`D${row}-E${row}`;sheet[`G${row}`].z='dd/mm/yyyy';}
  else {if(sheet[`C${row}`])sheet[`C${row}`].z='"$"#,##0.00';sheet[`F${row}`].z='dd/mm/yyyy';sheet[`G${row}`].z='dd/mm/yyyy';}
 }
 XLSX.utils.book_append_sheet(w,sheet,name==='stock_productos'?'Stock central':'Lista General');fs.mkdirSync('data',{recursive:true});fs.mkdirSync('public/data',{recursive:true});XLSX.writeFile(w,`data/${name}.xlsx`);fs.copyFileSync(`data/${name}.xlsx`,`public/data/${name}.xlsx`);
}
console.log('Excel generados: 20 productos, stock central y Lista General. Precios ficticios.');
