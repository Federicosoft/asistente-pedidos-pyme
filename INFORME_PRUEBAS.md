# Informe de pruebas · Nexo

Validación realizada el 9–10 de septiembre de 2026. Datos ficticios. Pruebas automatizadas de servicios con los Excel entregados y pruebas de interacción en Chrome sobre el servidor de desarrollo.

| Escenario | Resultado observado en navegador | Errores encontrados y correcciones | Pendiente |
|---|---|---|---|
| A · Pedido completo | REQ-005: 10 ROD-6205, stock completo, total con IVA $151.250, respuesta generada | Sin error comercial | Ninguno en este flujo |
| B · Varios productos | REQ-003: 100 ABC-100, 50 MTR-200 y 30 CR-500; completo/parcial/cero independientes | Verificado IVA incluido de ABC-100 sin duplicación | Ninguno |
| C · Incompleto → espera → respuesta → cotización | REQ-001: pregunta aprobada/copiada/confirmada; ESPERANDO CLIENTE; “50 unidades”; mismo ID y 3 mensajes; total $756.250 | Fecha predeterminada truncada a minutos podía quedar anterior al último mensaje; ahora usa instante de incorporación salvo edición expresa | La copia externa tiene la limitación indicada abajo |
| D · Dos cantidades faltantes | REQ-013: “Necesitamos 50” conserva ambas vacías y muestra ambigüedad; corrección a 20/50 y confirmación manual desbloquea | No se inventaron asociaciones | Ninguno |
| E · Teléfono → canal | REQ-004 exige teléfono en WhatsApp; al elegir email exige email; completar email desbloquea y genera asunto | No se permite respuesta telefónica | Reproductor visual, sin audio real, por alcance |
| F · Precio vencido | REQ-008 muestra Pendiente de precio, sin total cotizable y pide remediación | El precio vencido no entra al cálculo | Actualización del archivo gestionada fuera de la UI |
| G · Sin precio | REQ-009 excluye SEN-200, cotiza ROD-6205, muestra total parcial $151.250 y registra remediación con operador/hora | Sin precio no se interpreta como gratuito | Actualización del archivo gestionada fuera de la UI |
| H · Stock cero | REQ-011: cotiza 20 CR-500 por $556.600 con IVA y aclara que no existe entrega disponible | No promete reposición ni sustitutos | Ninguno |
| I · Stock parcial | REQ-010: cotiza 50 CR-100 por $790.000 con IVA; entrega limitada a 32, faltan 18 | IVA incluido respetado | Ninguno |
| J · Respuesta → auditoría → cierre | REQ-001: edición guardada, revisión, copia, confirmación, RESPONDIDO; cronología completa; cierre con motivo; recarga conserva CERRADO | Se corrigió indicador de etapas para no marcar stock consultado al pedir datos | Ver límite de portapapeles |

## Verificación técnica

| Control | Resultado |
|---|---|
| npm install | Correcto, salida 0 |
| npm run lint | Correcto, sin errores ni advertencias de código |
| npm run typecheck | Correcto, sin errores TypeScript |
| npm test | 10 pruebas aprobadas; incluyen A–J, consolidación de una cantidad entre dos productos, duplicados y entradas incorrectas |
| npm run dev | Inició correctamente mediante el supervisor de desarrollo; aplicación operada en navegador |
| Compilación de producción | Correcta; advertencia de tamaño de un paquete superior a 500 kB por dependencias cliente, no bloqueante |
| Excel | Generación y lectura de ambos archivos reales; 20 filas de productos; valores y fórmulas de stock utilizables; pruebas calculan desde sus bytes |
| Persistencia | Recarga conserva el caso cerrado, conversaciones y respuestas previas |
| Consola de la aplicación | Sin errores ni advertencias de aplicación en la revisión final |

Se observaron mensajes de error del complemento de control del navegador (`chrome-extension`), ajenos al código de Nexo. Se distinguieron de los mensajes de la aplicación. La instalación informa una configuración de proxy del entorno; no impide ejecutar el proyecto.

## Errores adicionales corregidos

- Coincidencia parcial de SKU: MTR-2000 se confundía con MTR-200. Se exige límite completo del identificador; prueba de regresión aprobada.
- Identificadores en una conexión HTTP de prueba: `crypto.randomUUID` no estaba disponible. Se agregó alternativa con `crypto.getRandomValues`, conservando identificadores aleatorios.
- Generación por CLI de tsx: el entorno restringía su socket temporal. Los comandos usan `node --import tsx`, sin ese socket.
- Importación de icono sin uso: eliminada, lint limpio.
- Campos de cliente/empresa con solo espacios: se validan como faltantes.
- Recomendación después de preparar una pregunta: ahora indica revisar/aprobar, en lugar de volver a preparar la misma solicitud.

## Alcance de la prueba de portapapeles

La UI ejecutó la copia y recibió confirmación del navegador; habilitó correctamente la confirmación del envío. El navegador remoto tiene un portapapeles virtual separado y su herramienta no pudo recuperar ni pegar el contenido copiado con el mecanismo de compatibilidad HTTP. Por lo tanto, **no se da por verificado el pegado efectivo en WhatsApp/email externos**. No se enviaron mensajes reales. La ruta HTTPS usa Clipboard API y la ruta HTTP usa `execCommand('copy')`; si la operación devuelve error, no se registra copia ni se habilita el envío. Conviene comprobar una copia y pegado local antes de la conferencia.

## Límites del MVP

Los servicios no consumen tokens ni contactan sistemas comerciales. El envío es una declaración del operador, no una comprobación del proveedor. La persistencia y auditoría son locales; no proporcionan seguridad multiusuario ni almacenamiento inviolable. El motor por reglas tiene cobertura para los ejemplos y permite corrección manual cuando no interpreta un mensaje. No se evaluaron todos los navegadores ni cargas grandes; el objetivo es la demostración desktop con 13 casos.
