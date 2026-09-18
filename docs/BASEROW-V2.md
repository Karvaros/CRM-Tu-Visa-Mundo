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

Los estados, perfiles y segmentos son texto controlado por el código de dominio. El ID interno de fila de Baserow es el identificador del registro: no se creó un campo `ID` duplicado. MENSAJES contiene 45 plantillas al 18 de septiembre de 2026: 24 SIN ESTUDIO y 21 ESTUDIO (nueve de Canadá y cuatro de cada uno de los otros tres destinos). Las que tienen enlaces o contenido por completar conservan `REQUIERE_REVISION=true` y el CRM bloquea su envío.

## Estado de la conexión

El token de base de datos está configurado como secreto `BASEROW_TOKEN` en Production de Vercel. Los ID de tabla figuran en las variables de entorno. La lectura paginada y la conversión al modelo del CRM están implementadas; el token permanece en el servidor y no se expone mediante `NEXT_PUBLIC_`. El CRM exige inicio de sesión y consulta Baserow a través de `/api/crm`.

Con `CRM_AUTH_ENABLED=true`, la UI muestra LEADS, INTERACCIONES y MENSAJES de Baserow. Permite responder, reprogramar y cambiar estado desde la ficha; el servidor actualiza LEADS y registra la acción en INTERACCIONES. No existe restablecimiento de datos reales. Los estudios A/B/C de los cuatro destinos empiezan en el mensaje de resultado correspondiente (orden 2). Tras confirmar el envío se programan testimonios (orden 3); la siguiente fecha se calcula desde el WhatsApp realmente enviado. El perfil D queda cerrado. En Canadá los mensajes posteriores que requieren revisión siguen bloqueados; en los demás destinos aún no se han definido pasos posteriores a testimonios.

Cuando un asesor cambia el estado a `NO_APTO` o `INACTIVO`, el servidor detiene primero las automatizaciones activas del contacto en ActiveCampaign y cancela sus suscripciones a todas las listas comerciales. Si ActiveCampaign falla, el CRM no guarda el nuevo estado y muestra un error para poder reintentar. Tras una detención correcta, Baserow guarda `AC_SYNC_STATUS=OPTED_OUT` junto con el estado y la interacción; un registro posterior en los formularios de país vuelve a aplicar la baja. Un estudio posterior de un lead cerrado puede conservar su primera clasificación, pero no inicia otra automatización de correo. Reabrir un lead en el CRM no lo vuelve a suscribir automáticamente. El perfil D generado directamente por el estudio conserva el correo que informa el resultado; solo una decisión posterior del asesor de marcar `NO_APTO` o `INACTIVO` aplica la baja global.

La recepción automática de los formularios de ActiveCampaign 1 (CAN/AU/UK) y 3 (EEUU) está activa en Production. El webhook «CRM V2 - registros formularios» escucha Contact Added de todas las listas, iniciado por el contacto, y envía al receptor `/api/activecampaign/form`. Ese endpoint es público únicamente para permitir la llamada externa: valida una firma HMAC-SHA256 con un secreto guardado en Vercel (`AC_WEBHOOK_SECRET`) y rechaza cualquier solicitud sin firma válida. `AC_FORM_SYNC_ENABLED=true` está limitado a Production. El correo de documentos de ActiveCampaign sigue independiente y no se modificó.

El 17 de septiembre de 2026 se probó el formulario público de Canadá con un contacto sintético nuevo. Vercel respondió HTTP 200, se creó un único lead en Baserow con origen `FORM_AC_CAN_AU_UK`, destino Canadá, segmento `SIN_ESTUDIO`, primer mensaje «Bienvenida Canadá» y próxima fecha 30 minutos después. El registro técnico se cambió a `INACTIVO` para excluirlo de HOY. La opción «Enviar datos de muestra» de ActiveCampaign omite el encabezado de firma y recibe HTTP 401; no debe usarse como prueba de entrega real. La inscripción previa (contacto 121) se había recuperado manualmente sin volver a enviar el correo de documentos.

Pendiente: probar una inscripción nueva del formulario específico de EEUU y de los destinos Australia/Reino Unido; revisar plantillas marcadas y redactar los pasos posteriores a testimonios para esos destinos; revisar la incorporación de estudios anteriores a la nueva secuencia sin sobrescribir atención manual. Ya se omiten testimonios si constan como enviados en SIN ESTUDIO; faltan equivalencias para otros hitos. El estudio público ya está conectado a ActiveCampaign. La conservación del primer resultado se apoya en el campo único `ID_EVENTO_EXTERNO`.
