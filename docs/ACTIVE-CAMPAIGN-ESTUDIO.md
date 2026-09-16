# Formularios y clasificación de estudio

Revisión de la configuración activa de ActiveCampaign, 16 de septiembre de 2026. La V2 todavía no está conectada a ActiveCampaign ni a Baserow.

| Entrada | Campos obligatorios comprobados | Origen de DESTINO |
| --- | --- | --- |
| Estudio de Perfil (formulario 7) | Nombre completo, correo electrónico, teléfono | No tiene selector de destino visible. Debe conservarse el destino del registro previo o definirse una regla de vinculación. |
| Form -CAN/AU/UK (formulario 1) | Nombre completo, correo electrónico, WhatsApp y destino | Selector: Canadá, Estados Unidos, Australia, Reino Unido, Otro Destino. |
| Form -EEUU (formulario 3) | Nombre completo, correo electrónico y WhatsApp | Se asigna Estados Unidos por el formulario de origen. |

El teléfono del estudio se marcó como obligatorio y se verificó después de guardar. Los formularios de registro ya tenían correo y WhatsApp obligatorios. El selector CAN/AU/UK también ofrece Estados Unidos pese a existir el formulario específico de EEUU; conviene decidir si se mantiene como vía adicional antes de modificarlo.

Las automatizaciones observadas distribuyen el estudio entre Alto renovación, Alto primera vez, Medio-Alto, Medio y Bajo. Cada ruta observada está configurada para ejecutarse una vez y envía el resultado por correo. Esa opción es por automatización; no demuestra que un contacto que repita el estudio no entre en otra ruta. La V2 debe guardar globalmente el primer `PRIMER_ESTUDIO_ID`, la fecha y el perfil A/B/C/D. Un segundo resultado no cambia la clasificación ni reinicia mensajes. Los reintentos con el mismo `ID_EVENTO_EXTERNO` deben ser idempotentes.

Perfil Bajo equivale a D: estado NO APTO, sin secuencia de WhatsApp ni tareas comerciales. Para A/B/C, la secuencia SIN ESTUDIO se pausa al recibir el primer resultado. La continuidad automática desde el mensaje 2 o 3 se implementará cuando estén definidos los hitos de WhatsApp y el vínculo seguro entre contactos de ActiveCampaign y Baserow. Hasta entonces, la función de dominio deja una revisión manual y no envía mensajes.

Pendiente para conectar: identificador estable del contacto entre formularios, ActiveCampaign y Baserow; tratamiento de contactos que llegan primero por el estudio sin destino conocido; mapeo de eventos/resultados; correspondencia de hitos ya enviados; y resolución de una conversación manual en curso. No activar integraciones de Hotmart, ManyChat ni envíos automáticos durante esta etapa.
