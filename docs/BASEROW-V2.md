# Base Baserow para CRM Tu Visa Mundo V2

Creada el 16 de septiembre de 2026 en el espacio de trabajo `236953`, independiente de las bases existentes `Lightweight CRM` y `Farmacia 2 TEST`. Base: `CRM Tu Visa Mundo V2`, ID `559655`. La tabla LEADS ya contiene registros de pruebas y del Estudio de Perfil; no borrarlos al retirar la demostración.

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

## Estado de la conexión

El token de base de datos está configurado como secreto `BASEROW_TOKEN` en Production de Vercel. Los ID de tabla figuran en las variables de entorno. La lectura paginada y la conversión al modelo del CRM están implementadas; el token permanece en el servidor y no se expone mediante `NEXT_PUBLIC_`. El CRM exige inicio de sesión y consulta Baserow a través de `/api/crm`.

Con `CRM_AUTH_ENABLED=true`, la UI muestra LEADS, INTERACCIONES y MENSAJES de Baserow. Permite responder, reprogramar y cambiar estado desde la ficha; el servidor actualiza LEADS y registra la acción en INTERACCIONES. No existe restablecimiento de datos reales. Los estudios A/B/C se programan para revisión manual; D queda cerrado. La tabla MENSAJES permanece vacía hasta importar y revisar las plantillas: no se debe atribuir ningún envío automático ni ofrecer textos ficticios en producción.

Pendiente: cargar y revisar plantillas en MENSAJES, asignar la secuencia y el hito correcto a cada lead después del estudio, y comprobar las acciones de escritura con la cuenta de asesor en producción. El estudio público ya está conectado a ActiveCampaign. La conservación del primer resultado se apoya en el campo único `ID_EVENTO_EXTERNO`.

