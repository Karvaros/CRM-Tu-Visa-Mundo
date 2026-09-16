# Base Baserow para CRM Tu Visa Mundo V2

Creada el 16 de septiembre de 2026 en el espacio de trabajo `236953`, independiente de las bases existentes `Lightweight CRM` y `Farmacia 2 TEST`. Base: `CRM Tu Visa Mundo V2`, ID `559655`. No contiene leads, interacciones ni mensajes reales; se retiraron las filas vacías generadas al crear las tablas.

| Tabla | ID | Propósito |
| --- | ---: | --- |
| LEADS | 1202313 | Contacto, clasificación inicial inmutable, estado y próxima acción. |
| INTERACCIONES | 1202321 | Historial de mensajes y eventos externos. |
| MENSAJES | 1202322 | Plantillas editables por secuencia y destino. |

## Campos creados

**LEADS:** `NOMBRE` (principal), `APELLIDO`, `EMAIL` (correo), `WHATSAPP` (teléfono), `DESTINO`, `TIPO_VISA`, `ORIGEN`, `SEGMENTO`, `TIPO_ESTUDIO`, `PERFIL_ESTUDIO`, `PRIMER_ESTUDIO_ID`, `FECHA_PRIMER_ESTUDIO` (fecha y hora), `AC_CONTACT_ID`, `AC_SYNC_STATUS`, `SECUENCIA_ID`, `ULTIMO_HITO_WHATSAPP`, `FECHA_INGRESO` (fecha y hora), `ESTADO`, `ULTIMO_CONTACTO` (fecha y hora), `PROXIMO_CONTACTO` (fecha y hora), `PROXIMA_ACCION` (texto largo), `ULTIMO_MENSAJE` y `PROXIMO_MENSAJE` (relaciones únicas con MENSAJES), `SEGUIMIENTO_MANUAL` y `SECUENCIA_PAUSADA` (booleanos), `ASESOR`, `VERSION` (número), `NOTAS` (texto largo), `INTERACCIONES` (relación inversa).

**INTERACCIONES:** `TIPO` (principal), `ID_EVENTO_EXTERNO`, `LEAD` (relación única con LEADS), `FECHA` (fecha y hora), `DETALLE` (texto largo), `MENSAJE` (relación única con MENSAJES), `MENSAJE_TEXTO` (texto largo), `ASESOR`, `ORIGEN_SISTEMA`, `ES_REPETIDO` (booleano).

**MENSAJES:** `TITULO` (principal), `TEXTO` (texto largo), `SECUENCIA_ID`, `SEGMENTOS`, `DESTINO`, `ORDEN` y `DIA_SECUENCIA` (números), `HITO_WHATSAPP`, `RECURSO_TIPO`, `RECURSO_URL` (URL), `SOLO_DIAS_HABILES`, `BORRADOR` y `REQUIERE_REVISION` (booleanos), `OBSERVACIONES` (texto largo).

Los estados, perfiles y segmentos son texto controlado por el código de dominio; aún no hay opciones de selección ni valores cargados. El ID interno de fila de Baserow será el identificador del registro: no se creó un campo `ID` duplicado. Los mensajes comerciales existentes siguen en el repositorio y deberán revisarse antes de importarlos a MENSAJES.

## Conexión pendiente

Crear un token de base de datos con acceso mínimo a estas tres tablas y configurarlo **solo del lado del servidor** del proyecto Vercel, junto con los ID de las tablas. No guardar el token en GitHub ni exponerlo mediante `NEXT_PUBLIC_`. Antes de enviar resultados reales a ActiveCampaign, implementar la escritura y lectura de Baserow, la reconciliación de contactos por un identificador estable, la reserva de la primera clasificación y los reintentos de sincronización.

`PRIMER_ESTUDIO_ID` y `ID_EVENTO_EXTERNO` por sí solos no hacen atómica una comprobación seguida de una escritura. La integración debe impedir que dos envíos simultáneos del mismo contacto activen dos rutas distintas; hasta resolverlo, `/estudio` permanece como vista de prueba y la página pública conserva el formulario actual.
