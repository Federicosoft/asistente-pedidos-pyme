import type {Product,Operator} from '../lib/domain/models';
export const operators:Operator[]=[{id:'laura',name:'Laura Gómez'},{id:'martin',name:'Martín Rodríguez'},{id:'carlos',name:'Carlos Fernández'},{id:'federico',name:'Federico'}];
export const catalog:Product[]=[
 ['ROD-6205','Rodamiento SKF 6205','Rodamientos','SKF 6205|rodamientos SKF 6205|rodamiento 6205'],
 ['ABC-100','Rodamiento rígido ABC-100','Rodamientos','ABC-100'],
 ['MTR-200','Motor eléctrico trifásico MTR-200','Motores eléctricos','MTR-200'],
 ['CR-100','Correa industrial CR-100','Correas industriales','CR-100'],
 ['CR-500','Correa reforzada CR-500','Correas industriales','CR-500'],
 ['BOM-100','Bomba centrífuga BOM-100','Bombas','BOM-100'],
 ['BOM-200','Bomba sumergible BOM-200','Bombas','BOM-200'],
 ['VAL-100','Válvula esférica VAL-100','Válvulas','VAL-100'],
 ['VAL-200','Válvula de retención VAL-200','Válvulas','VAL-200'],
 ['SEN-100','Sensor inductivo SEN-100','Sensores','SEN-100'],
 ['SEN-200','Sensor fotoeléctrico SEN-200','Sensores','SEN-200'],
 ['HER-100','Llave de torque HER-100','Herramientas','HER-100'],
 ['HER-200','Juego de mechas HER-200','Herramientas','HER-200'],
 ['ELE-100','Contactor ELE-100','Componentes eléctricos','ELE-100'],
 ['ELE-200','Relé térmico ELE-200','Componentes eléctricos','ELE-200'],
 ['ROD-6306','Rodamiento 6306','Rodamientos','ROD-6306|rodamiento 6306'],
 ['MTR-300','Motor monofásico MTR-300','Motores eléctricos','MTR-300'],
 ['CR-300','Correa dentada CR-300','Correas industriales','CR-300'],
 ['VAL-300','Válvula neumática VAL-300','Válvulas','VAL-300'],
 ['ELE-300','Interruptor termomagnético ELE-300','Componentes eléctricos','ELE-300']
].map(([sku,name,category,aliases])=>({sku,name,category,aliases:aliases.split('|')}));
