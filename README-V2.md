# CRM Tu Visa Mundo V2

Trabajo exclusivo en `crm-v2-vercel`. El CRM Streamlit, los archivos Python, `requirements.txt` y `render.yaml` permanecen intactos. No fusionar a `main` durante esta construcción.

## Ejecutar

Node.js 22 LTS. Desde la raíz: `npm ci`, `npm run dev`; abrir http://localhost:3000.

Validación: `npm test`, `npm run typecheck`, `npm run build`.

## Estado

Se conserva el diseño original de HOY y sus cuatro leads. HOY es funcional con búsqueda, filtros, cuatro grupos de pendientes, copiar, WhatsApp con texto, confirmación de envío, respuesta, reprogramación y ficha. LEADS permite encontrar todos los registros, incluso los futuros y cerrados; PIPELINE e HISTORIAL son vistas básicas; MENSAJES permite revisar y editar las secuencias; CONFIGURACIÓN permite reiniciar la demo.

La demo usa sessionStorage: conserva acciones, mensajes e historial al recargar la misma pestaña. No comparte datos entre asesores/dispositivos. No usar datos reales. No hay credenciales, envíos automáticos, autenticación ni conexiones externas implementadas.

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
- SIN ESTUDIO representa registros que todavía no hicieron el estudio. ESTUDIO A es perfil Alto, ESTUDIO B es Medio-Alto y ESTUDIO C es Medio. `TIPO_ESTUDIO` se guarda por separado (`NINGUNO`, `GRATUITO`, `PAGO`) para no confundir la calificación con la modalidad del estudio.
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
| LEADS | ID, VERSION, NOMBRE, APELLIDO, WHATSAPP, EMAIL, DESTINO, TIPO_VISA, ORIGEN, SEGMENTO, TIPO_ESTUDIO, PERFIL_ESTUDIO, SECUENCIA_ID, ULTIMO_HITO_WHATSAPP, FECHA_INGRESO, ESTADO, ULTIMO_CONTACTO, ULTIMO_MENSAJE (relación), PROXIMO_CONTACTO, PROXIMA_ACCION, PROXIMO_MENSAJE (relación), SEGUIMIENTO_MANUAL, SECUENCIA_PAUSADA, ASESOR, NOTAS |
| INTERACCIONES | ID, ID_EVENTO_EXTERNO, LEAD (relación), TIPO, FECHA (UTC), DETALLE, MENSAJE (relación), MENSAJE_TEXTO (copia histórica), ASESOR, ORIGEN_SISTEMA |
| MENSAJES | ID, SECUENCIA_ID, SEGMENTOS, DESTINO, ORDEN, DIA_SECUENCIA, HITO_WHATSAPP, TITULO, TEXTO, RECURSO_TIPO, RECURSO_URL, SOLO_DIAS_HABILES, BORRADOR, REQUIERE_REVISION, OBSERVACIONES |

Antes de habilitar datos reales: definir permisos/autenticación, paginación, validación de respuestas y estrategia de concurrencia/idempotencia para la escritura coordinada de lead + interacción. El adaptador Baserow no está implementado; no se asume atomicidad entre tablas. ASESOR es opcional y no depende de Augusto/Diana.

## Transición futura de SIN ESTUDIO a ESTUDIO A/B/C

Esta transición se implementará cuando existan el estudio en línea, Baserow y la integración con ActiveCampaign. ActiveCampaign deberá informar que la respuesta del estudio fue enviada e incluir una referencia inequívoca al lead y su clasificación A, B o C. Baserow será la fuente de verdad del estado operativo del CRM.

El cambio de segmento no debe reiniciar la comunicación. El CRM conservará el último mensaje de WhatsApp realmente confirmado como enviado y su `HITO_WHATSAPP`. Al recibir el evento del estudio, pausará SIN ESTUDIO, registrará una interacción `RESPUESTA_ESTUDIO_ENVIADA`, asignará ESTUDIO A/B/C y elegirá el primer mensaje del nuevo segmento cuyo hito todavía no haya recorrido el lead. La próxima fecha se calculará desde el último envío real, de acuerdo con el intervalo del mensaje seleccionado.

No se debe inferir el avance solo por días desde el registro, por mensajes abiertos en WhatsApp ni por mensajes copiados. Solamente cuentan las confirmaciones de envío almacenadas en INTERACCIONES. El evento externo debe usar `ID_EVENTO_EXTERNO` para que un reintento de ActiveCampaign no cambie dos veces el segmento ni cree interacciones duplicadas.

Antes de implementar esta regla falta definir la correspondencia exacta entre los hitos de SIN ESTUDIO y ESTUDIO A/B/C, el identificador compartido entre ActiveCampaign y Baserow, y qué ocurre si el evento llega mientras existe una respuesta o seguimiento manual pendiente.

## Vercel

Crear un proyecto de Vercel independiente para la V2, framework Next.js, raíz del repositorio, `npm ci` y `npm run build`, Node 22. Seleccionar `crm-v2-vercel` como rama del proyecto V2; no cambiar la rama ni el servicio de Render. La demo no requiere variables de entorno. Se puede desplegar sin Baserow, pero solo contiene datos ficticios. Este cambio no crea ni modifica despliegues.

## Pendientes detectados en los mensajes

- No existe una secuencia que ofrezca o conduzca al estudio de perfil pago, ni se incluyó su checkout. SIN ESTUDIO conduce solamente al estudio gratuito.
- ESTUDIO A/B/C no diferencia si el estudio ya efectuado fue gratuito o pago.
- Faltan el enlace web de testimonios, el Reel de tres errores, el video de Ana y su hija, la imagen/fecha de la oferta y el video de beneficios del Plan Basic en la secuencia ESTUDIO.
- Australia contiene enlaces de Canadá en los mensajes 3 y 5. Estados Unidos menciona Canadá en el mensaje 2 y enlaza la página de Canadá en el mensaje 3. La URL de Perfil de Reino Unido difiere de la utilizada en las demás secuencias y debe confirmarse.

Pendiente: conectar Baserow y autenticación, completar los recursos anteriores, construir la secuencia del estudio pago, implementar la transición por hitos con ActiveCampaign y ampliar pantallas secundarias. Hotmart, ManyChat y ActiveCampaign quedan sin conexión durante esta etapa.

