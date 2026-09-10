# Nexo · Asistente comercial para PyMEs

Aplicación de demostración para una PyME industrial argentina de 50–100 empleados. Centraliza consultas de WhatsApp, email y teléfono como **casos comerciales** que acumulan mensajes, productos, validaciones, cotizaciones y auditoría. La IA asiste; la persona revisa, decide y confirma.

**Demo pública:** https://pedidos-pyme.fede1360.chatgpt.site

## Ejecutar

Requiere Node.js >=22.13.0 y npm. Desde esta carpeta:

```sh
npm install
npm run dev
```

Abrir la dirección local indicada por la consola (habitualmente http://localhost:5173). No requiere claves ni cuentas de proveedores. El proyecto usa React 19, TypeScript, componentes shadcn/ui, Tailwind 4, Lucide y SheetJS. Las rutas siguen Next.js App Router y se ejecutan mediante Vinext/Vite, compatible con el alojamiento de Sites. No existe un backend comercial externo: casos y operadores se guardan en el navegador.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

En el entorno administrado de Sites, el supervisor inicia `npm run dev` para las pruebas de navegador. La configuración local de ese entorno no se distribuye con el código. En una descarga, el script adopta automáticamente el perfil portable.

## Demostración de tres minutos

1. Dashboard → Bandeja → REQ-002 (dos productos).
2. Mostrar MTR-200 con 20 unidades y ROD-6205 sin cantidad.
3. Preparar solicitud de información → revisar → aprobar → copiar → confirmar envío manual. El caso pasa a ESPERANDO CLIENTE.
4. Simular respuesta: “50 unidades.” → agregar. Se conserva REQ-002; quedan 20 motores y 50 rodamientos.
5. Consultar precio y stock. Hay solo 12 motores disponibles: se cotizan 20, aclarando que solo se entregan 12.
6. Preparar respuesta comercial → editar → guardar → aprobar → copiar → confirmar. Estado RESPONDIDO.
7. Abrir Auditoría e historial; cerrar manualmente con motivo.

REQ-001 ofrece el mismo recorrido con un solo producto. REQ-009 muestra cotización parcial y remediación de precio. REQ-013 demuestra ambigüedad: “Necesitamos 50” no se asigna a ninguno de los dos productos sin cantidad.

## Estructura y arquitectura

| Ubicación | Responsabilidad |
|---|---|
| `app/` | Página, layout, estilos y entrada de la aplicación |
| `components/workspace.tsx` | Dashboard, bandeja, auditoría global, filtros, alta y persistencia |
| `components/case-workspace.tsx` | Conversación, edición, cotización y revisión humana |
| `components/ui/` | Primitivas shadcn/ui |
| `lib/domain/` | Tipos y funciones comunes de fecha, moneda e identificadores |
| `lib/services/aiService.ts` | Extracción simulada y acumulación de contexto |
| `lib/services/validation.ts` | Validaciones globales y por producto |
| `lib/services/excelService.ts` | Lectura y control de los dos Excel |
| `lib/services/quotationService.ts` | Stock, vigencia y cálculo monetario |
| `lib/services/responseService.ts` | Redacción y próximo paso recomendado |
| `lib/services/caseService.ts` | Transiciones, revisión, copia, confirmación y auditoría |
| `lib/services/persistence.ts` | localStorage versionado y exportación JSON |
| `data/` | Catálogo, operadores, casos de ejemplo y Excel originales |
| `public/data/` | Copias de Excel que consulta la aplicación |
| `scripts/generate-data.ts` | Generación reproducible de ambos Excel |
| `tests/business.test.ts` | Pruebas de integración de servicios y reglas |

Las operaciones de negocio clonan el caso antes de modificarlo. Una revisión identifica el contexto usado para cotizar: cambiar datos invalida la consulta, el borrador activo y su aprobación, conservando sus versiones históricas. La UI solo confirma el cambio si la persistencia fue exitosa. La revisión global detecta modificaciones de otra pestaña y pide recargar en lugar de sobrescribirlas.

## Entidades

`CommercialCase` contiene identificación, cliente/empresa, contactos, canal inicial y de respuesta, fechas, destino, moneda, observaciones, responsable, productos, conversación, validaciones, cotización actual e historial, respuestas, remediaciones y auditoría.

`ConversationMessage` conserva dirección, canal, fecha/hora, texto, asunto, tipo y operador. `OrderItem` conserva descripción original, SKU, cantidad como texto (para validar entradas incorrectas), origen, candidatos, precio y stock consultados. `Quotation` guarda líneas incluidas, SKU excluidos, subtotal neto, IVA, total y revisión. `ResponseDraft` guarda aprobación, copia y confirmación; sus cambios completos quedan además en eventos. `AuditEvent` conserva tipo, operador, fecha/hora y datos antes/después. `Operator` representa un rol simulado, sin autenticación. `Remediation` identifica precio pendiente, solicitud interna y resolución por nueva consulta vigente.

## Estados

| Estado | Significado |
|---|---|
| NUEVO | Solicitud recibida |
| EN ANÁLISIS | Extracción por reglas |
| FALTA INFORMACIÓN | Existe un bloqueo o ambigüedad |
| ESPERANDO CLIENTE | Se confirmó el envío de una pregunta |
| LISTO PARA COTIZAR | Datos obligatorios completos |
| EN COTIZACIÓN | Consulta y cálculo; puede requerir remediación |
| RESPUESTA PREPARADA | Borrador pendiente de revisión |
| PENDIENTE DE ENVÍO | Operador aprobó; falta copiar/enviar/confirmar |
| RESPONDIDO | Envío comercial confirmado, sin cerrar |
| CERRADO | Cierre manual con motivo; solo lectura |

Los estados iniciales de análisis son breves y quedan en auditoría. Toda nueva respuesta del cliente revalida el contexto. No se elimina el caso al pedir información ni al enviar una cotización. La aplicación no envía mensajes a ningún servicio.

## Reglas comerciales acordadas

- Se cotiza la **cantidad solicitada**, incluso con stock parcial o cero. La respuesta especifica que solo se entrega lo disponible; no promete reposición ni plazos.
- Stock utilizable = disponible − reservado. Stock completo si cubre la cantidad, parcial si está entre cero y la cantidad, sin stock si es cero. El posterior teórico tiene piso cero. Consultar/cotizar no reserva ni descuenta stock.
- Precios en ARS, Lista General, IVA 21% de esta simulación. Si el precio incluye IVA se obtiene el neto dividiendo por 1,21; nunca se suma IVA nuevamente al importe bruto. Redondeo a centavos por línea y suma de líneas.
- Precios vencidos, futuros o ausentes: **Pendiente de precio**. Esas líneas se excluyen del total y originan remediación; las demás pueden cotizarse. Si ninguna línea tiene precio vigente no se genera un total cotizable.
- La vigencia se verifica a la fecha de consulta y de confirmación, usando día de Argentina. La fecha del mensaje del cliente puede editarse y debe ser posterior al último mensaje; si no se modifica se toma el instante de incorporación.
- Solicitar remediación registra una tarea simulada con operador y fecha. Para resolverla, actualizar el Excel y volver a consultar. No se envía una notificación real.
- Cerrar un caso respondido con pendientes exige un motivo explícito, mostrado junto a la advertencia.

## Validaciones

Bloquean: falta simultánea de cliente y empresa, canal de respuesta sin contacto válido, ausencia de productos, SKU inexistente, producto ambiguo, cantidades ausentes/no numéricas/cero/negativas/fraccionarias, duplicados, cantidades individuales ambiguas, nueva información no interpretable, fecha inválida o anterior a la solicitud y moneda diferente de ARS. Cliente o empresa por separado, fecha, entrega y contactos secundarios faltantes generan advertencias. Stock y precio se evalúan por línea; no impiden analizar otras líneas.

“Necesitamos 50” completa la única línea sin cantidad. Si dos líneas esperan cantidad, se registra ambigüedad y el operador debe resolverla desde Editar datos. Datos no interpretados no sustituyen el historial. El porcentaje cuenta campos completos, incluidos recomendados; por eso puede ser menor a 100% y permitir cotizar.

## Excel y datos ficticios

Se entregan `data/stock_productos.xlsx` y `data/precios_productos.xlsx`, con 20 productos. Los SKU enlazan ambas fuentes. El stock usa fórmula disponible menos reservado, con resultado guardado para lectura. Los precios incluyen fechas reales, productos vigentes, uno vencido y uno sin precio.

Para editar stock/precios manualmente, modificar los archivos de `data/`, conservar encabezados/SKU, recalcular y guardar con Excel o LibreOffice. Ejecutar `npm run data:sync` para copiar ambos archivos a `public/data/`, y usar Volver a consultar. En el sitio alojado, los Excel son parte de la publicación: la modificación requiere volver a publicar. No hay carga de archivos desde la UI en este MVP.

Para regenerar todos los valores ficticios y fechas relativas al día actual: `npm run data:generate`. Este comando reemplaza los Excel de ejemplo; no lo uses para sincronizar ediciones manuales. Los casos persistidos se conservan. Para agregar productos, modificar `data/catalog.ts`, los valores del generador y generar nuevamente, o agregar filas consistentes a ambos Excel y sincronizar. Para agregar operadores, editar `operators` en `data/catalog.ts`. Para nuevos casos usar Nueva consulta; para nuevos ejemplos de fábrica editar `data/demoCases.ts` (solo se aplican en un navegador sin casos guardados).

## Persistencia y auditoría

localStorage clave `nexo.pedidos.v1`. Recargar conserva casos, operador, historial y remediaciones. Exportar historial descarga una copia JSON completa. No existe importación/restauración desde interfaz. Los datos pertenecen a ese navegador/origen: no se sincronizan entre dispositivos ni operadores reales. No borrar los datos del navegador si se quiere conservar la demostración.

Los eventos no se editan ni eliminan desde la aplicación. Mensajes, borradores originales, ediciones, respuestas utilizadas, cambios manuales, consultas con sus valores, estados y operador se preservan. Esto es inmutabilidad funcional del MVP, no un registro legal inviolable: localStorage puede ser alterado desde herramientas del navegador y tiene capacidad limitada.

## Sustituir las simulaciones

`AIService` define extracción de campos, productos y procesamiento de respuestas. Un adaptador LLM futuro debe devolver esos modelos validados, incluir origen/confianza, preservar contexto y nunca ejecutar envíos ni saltar revisiones. Las claves se deben manejar en un servicio seguro futuro; nunca en componentes o localStorage. Este MVP no llama a OpenAI, Claude, Gemini ni otros modelos.

Para ERP/API, reemplazar `loadSystems()` por un adaptador que entregue `SystemsData` y conserve validaciones, moneda, vigencia y trazabilidad del origen. Los servicios de cotización no necesitan saber si los datos provienen de Excel o ERP. Stock sigue siendo una consulta hasta diseñar explícitamente una operación de reserva. La remediación podría integrarse a una cola interna en una fase posterior.

## Límites actuales y siguientes pasos

IA por reglas: no entiende lenguaje arbitrario, OCR ni audio; el reproductor telefónico es visual y usa transcripción ficticia. La revisión humana es necesaria. Las respuestas de WhatsApp priorizan claridad comercial y pueden ser extensas con muchos productos. Operadores sin autenticación, almacenamiento local, sin colaboración simultánea real, sin envíos, ERP ni LLM externos. El portapapeles depende de permisos del navegador; si falla no se habilita la confirmación. Para producción: persistencia con control de acceso, auditoría durable, respaldo, integración de catálogo y pruebas de seguridad antes de habilitar datos reales.

Ver `INFORME_PRUEBAS.md` para resultados y limitaciones de verificación.
