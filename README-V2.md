# CRM Tu Visa Mundo V2

Trabajo exclusivo en `crm-v2-vercel`. El CRM Streamlit, los archivos Python, `requirements.txt` y `render.yaml` permanecen intactos. No fusionar a `main` durante esta construcción.

## Ejecutar

Node.js 22 LTS. Desde la raíz: `npm ci`, `npm run dev`; abrir http://localhost:3000.

Validación: `npm test`, `npm run typecheck`, `npm run build`.

## Estado

Se conserva el diseño original de HOY y sus cuatro leads. HOY es funcional con búsqueda, filtros, cuatro grupos de pendientes, copiar, WhatsApp con texto, confirmación de envío, respuesta, reprogramación y ficha. LEADS permite encontrar todos los registros, incluso los futuros y cerrados; PIPELINE e HISTORIAL son vistas básicas; MENSAJES permite revisar y editar las secuencias; CONFIGURACIÓN permite reiniciar la demo.

La demo usa sessionStorage: conserva acciones, mensajes e historial al recargar la misma pestaña. No comparte datos entre asesores/dispositivos. No usar datos reales. No hay credenciales, envíos automáticos, autenticación ni conexiones externas implementadas.

`/estudio` es la vista de prueba del nuevo estudio gratuito: una pregunta por página (nueve preguntas y una página final de contacto), preguntas del formulario actual más destino para visa de turismo, clasificación local y correo/teléfono obligatorios. No guarda respuestas ni envía correos o eventos al CRM; no usar para captar leads hasta completar Baserow y ActiveCampaign. Ver `docs/ACTIVE-CAMPAIGN-ESTUDIO.md`.

## Reglas implementadas

- Las prioridades son derivadas de fecha, estado y modalidad, no un campo persistido.
- Nuevos y seguimientos se muestran cuando su fecha es hoy o anterior. Los manuales vencidos se incluyen en Manuales. Los contadores generales no cambian al filtrar; cada sección muestra el resultado filtrado.
- Abrir WhatsApp/copiar no altera datos. Solo confirmar envío registra fecha/hora, texto exacto, asesor y siguiente paso. El siguiente contacto se calcula desde ese envío real; el intervalo es por paso, no acumulado desde el ingreso.
- Si la plantilla lo indica, un contacto que cae en sábado/domingo pasa al lunes. No se modelan feriados. Zona horaria explícita: Buenos Aires.
- Respondió pausa la secuencia y crea atención manual para hoy. Una reprogramación mantiene estado y último envío. Un envío manual termina esa acción sin reactivar la secuencia; el asesor puede programar otra desde LEADS.
- Fin de secuencia elimina el pendiente automático y mantiene el lead en LEADS. CLIENTE registra conceptualmente venta; NO APTO e INACTIVO cierran el seguimiento sin borrar historial. Reabrir requiere cambiar estado y programar una acción manual.
- Las versiones de lead y el bloqueo de guardado evitan confirmar dos veces el mismo envío.
- `data/mensajes.json` contiene 32 mensajes entregados por el usuario: 24 para SIN ESTUDIO (Canadá, Australia, Estados Unidos y Reino Unido) y 8 entradas para ESTUDIO A/B/C. Ninguno usa variables de nombre, para que pueda copiarse como difusión. Cambiar un mensaje no modifica envíos históricos ni fechas previamente programadas.
- Los mensajes usan el día absoluto de su secuencia. Después de confirmar un envío, la próxima fecha se calcula con la diferencia entre el día del mensaje actual y el siguiente aplicable al segmento.
- SIN ESTUDIO representa registros que todavía no hicieron el estudio. ESTUDIO A es perfil Alto, ESTUDIO B es Medio-Alto, ESTUDIO C es Medio y ESTUDIO D es Bajo. D pasa a NO APTO y no tiene secuencia ni seguimiento comercial. `TIPO_ESTUDIO` se guarda por separado (`NINGUNO`, `GRATUITO`, `PAGO`) para no confundir la calificación con la modalidad del estudio.
- La función de dominio `applyStudyClassification` conserva la primera clasificación A/B/C/D, ignora reintentos del mismo evento y registra otros estudios como repetidos sin cambiar el perfil. Para A/B/C pausa la secuencia y deja revisión manual hasta implementar la continuidad por hitos. Todavía no recibe eventos reales.
- Los mensajes con marcadores, recursos faltantes o enlaces posiblemente cruzados tienen `REQUIERE_REVISION=true`. HOY bloquea Copiar, WhatsApp y Confirmar envío para esos mensajes hasta que se desmarque la revisión en MENSAJES.

## Capas y conexión futura a Baserow

- `components/`: interfaz. Consume el proveedor y tipos del dominio.
- `lib/repository.ts`: contrato asíncrono `CrmRepository` (lectura, comandos, edición de mensajes).
- `lib/mock-repository.ts`: adaptador de demo; `lib/mock-data.ts`: semilla relativa al día inicial.
- `lib/crm.ts`: reglas puras y comandos; `lib/dates.ts`: calendario.
- `lib/types.ts`: entidades LEADS, INTERACCIONES y MENSAJES.

Para Baserow, sustituir la creación del repositorio en el proveedor por un adaptador HTTP que llame a Route Handlers autenticados de Next.js. Reutilizar reglas y tipos. El servidor mapeará IDs/columnas Baserow; el token solo debe existir en variables de entorno del servidor, nunca NEXT_PUBLIC ni en el navegador. No almacenar datos de producción en memoria del proceso de Vercel.

| Tabla | Campos previstos |
| --- | --- |
| LEADS | ID, VERSION, NOMBRE, APELLIDO, WHATSAPP, EMAIL, DESTINO, TIPO_VISA, ORIGEN, SEGMENTO, TIPO_ESTUDIO, PERFIL_ESTUDIO, PRIMER_ESTUDIO_ID, FECHA_PRIMER_ESTUDIO, SECUENCIA_ID, ULTIMO_HITO_WHATSAPP, FECHA_INGRESO, ESTADO, ULTIMO_CONTACTO, ULTIMO_MENSAJE (relación), PROXIMO_CONTACTO, PROXIMA_ACCION, PROXIMO_MENSAJE (relación), SEGUIMIENTO_MANUAL, SECUENCIA_PAUSADA, ASESOR, NOTAS |
| INTERACCIONES | ID, ID_EVENTO_EXTERNO, LEAD (relación), TIPO, FECHA (UTC), DETALLE, MENSAJE (relación), MENSAJE_TEXTO (copia histórica), ASESOR, ORIGEN_SISTEMA |
| MENSAJES | ID, SECUENCIA_ID, SEGMENTOS, DESTINO, ORDEN, DIA_SECUENCIA, HITO_WHATSAPP, TITULO, TEXTO, RECURSO_TIPO, RECURSO_URL, SOLO_DIAS_HABILES, BORRADOR, REQUIERE_REVISION, OBSERVACIONES |

Antes de habilitar datos reales: definir permisos/autenticación, paginación, validación de respuestas y estrategia de concurrencia/idempotencia para la escritura coordinada de lead + interacción. El adaptador Baserow no está implementado; no se asume atomicidad entre tablas. ASESOR es opcional y no depende de Augusto/Diana.

## Transición futura de SIN ESTUDIO a ESTUDIO A/B/C/D

La primera versión del estudio en línea ya existe en ActiveCampaign, pero todavía no está conectada a esta V2. El adaptador deberá recibir una referencia inequívoca al lead y su clasificación A, B, C o D. Baserow será la fuente de verdad del estado operativo del CRM. D termina el seguimiento sin mensajes automáticos.

El cambio de segmento no debe reiniciar la comunicación. El CRM conservará el último mensaje de WhatsApp realmente confirmado como enviado y su `HITO_WHATSAPP`. Al recibir el evento del estudio, pausará SIN ESTUDIO, registrará la primera clasificación y omitirá la bienvenida de ESTUDIO. Las automatizaciones revisadas de ActiveCampaign envían el resultado por correo; no se ha verificado un envío de resultado por WhatsApp. Por ello, A/B/C comenzará en el mensaje 2 según lo recorrido en WhatsApp. El mensaje 3 solo corresponderá cuando se confirme que el mensaje de perfil ya se envió por WhatsApp. Desde allí elegirá el primer hito que el lead todavía no haya recorrido y calculará la próxima fecha desde el último envío real.

No se debe inferir el avance solo por días desde el registro, por mensajes abiertos en WhatsApp ni por mensajes copiados. Solamente cuentan las confirmaciones de envío almacenadas en INTERACCIONES. El evento externo debe usar `ID_EVENTO_EXTERNO` para que un reintento de ActiveCampaign no cambie dos veces el segmento ni cree interacciones duplicadas.

La primera respuesta válida del estudio fija de manera permanente la clasificación A/B/C/D mediante `PRIMER_ESTUDIO_ID` y `FECHA_PRIMER_ESTUDIO`. Si el contacto completa el estudio nuevamente, el evento se registra para auditoría como repetido, pero no cambia `PERFIL_ESTUDIO`, no reinicia la secuencia y no vuelve a enviar el mensaje de resultado. La configuración “Una vez” observada es por automatización; el bloqueo global debe vivir en el CRM/Baserow.

Antes de automatizar la transición falta definir la correspondencia exacta de los hitos posteriores al mensaje de perfil, el identificador compartido entre ActiveCampaign y Baserow y qué ocurre si el evento llega mientras existe una respuesta o seguimiento manual pendiente. Ver `docs/ACTIVE-CAMPAIGN-ESTUDIO.md`.

## Vercel

Crear un proyecto de Vercel independiente para la V2, framework Next.js, raíz del repositorio, `npm ci` y `npm run build`, Node 22. Seleccionar `crm-v2-vercel` como rama del proyecto V2; no cambiar la rama ni el servicio de Render. La demo no requiere variables de entorno. Se puede desplegar sin Baserow, pero solo contiene datos ficticios. Este cambio no crea ni modifica despliegues.

## Pendientes detectados en los mensajes

- SIN ESTUDIO conduce a la página del estudio en línea. Esa misma URL alojará las opciones que se construyan después.
- El estudio pago no tendrá una secuencia automática. Un asesor lo ofrecerá durante una conversación cuando el lead quiera hacer el estudio acompañado; el CRM conservará `TIPO_ESTUDIO=PAGO` para registrar esa decisión.
- Faltan el Reel de tres errores, el video de Ana y su hija, la imagen y regla de vigencia de la oferta del 25 %, y el video de beneficios del Plan Basic en la secuencia ESTUDIO.
- La URL de Perfil de Reino Unido debe confirmarse.
- El seguimiento detallado está en `docs/PENDIENTES-MENSAJES.md`.

Pendiente: conectar Baserow y autenticación, completar los recursos anteriores, implementar la transición por hitos con ActiveCampaign y ampliar pantallas secundarias. Hotmart, ManyChat y ActiveCampaign quedan sin conexión durante esta etapa.
