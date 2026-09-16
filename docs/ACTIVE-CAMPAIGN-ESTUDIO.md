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

## Nuevo estudio por páginas (V2)

La ruta `/estudio` usa una pantalla independiente del menú del CRM. Presenta una sola pregunta por página: nueve preguntas y una página final de nombre, correo y teléfono obligatorios. Reproduce las preguntas del formulario 7 y agrega destino, formulado explícitamente para visa de turismo, porque el formulario 7 no lo pregunta y el CRM lo necesita. Por ahora es una vista de prueba: clasifica en el navegador, no guarda datos, no envía correos ni crea leads.

La página pública existente `https://www.tuvisamundo.com/estudio-de-perfil-en-linea/` será la entrada al estudio. No hacen falta diez páginas de WordPress: «una pregunta por página» describe las diez pantallas del asistente en una sola ruta de Next.js (`/estudio`), que cambia el paso visible sin navegar a otra URL. Al publicar el reemplazo, el botón de esa página podrá abrir la URL pública del asistente alojado en Vercel. La URL de Vercel, el enlace definitivo y el momento de sustituir el formulario actual se definirán tras conectar persistencia y correo; la página y automatizaciones actuales no deben desconectarse mientras esta vista sea de prueba.

La vista de prueba usa una copia local del logo transparente publicado en la cabecera de esa página. El archivo original de agosto de 2024 compartido en la unidad `G:` no fue accesible desde el entorno de desarrollo; si se necesita la versión de mayor resolución para producción, reemplazar `public/logo-tu-visa-mundo.png` con ese original.

La elección de grupo adapta el lenguaje posterior. Cuando responde «Solo yo», pasaportes tiene únicamente «Sí, tengo pasaporte vigente» o «No tengo pasaporte vigente», y ocupación, visas, viajes y familia se preguntan en singular. En grupo se conservan las opciones de pasaporte para todos, algunos o ninguno y las preguntas se refieren al solicitante principal. Los valores internos siguen siendo los del formulario original para mantener las reglas de clasificación. Si alguien vuelve atrás y cambia el grupo, se vuelven a pedir las respuestas posteriores que dependían de esa elección. Si cambia el destino, se vuelve a preguntar por familiares en ese país.

Reglas reconstruidas de las automatizaciones activas: Bajo/D si el solicitante es desempleado/informal en primera vez, hay irregularidad/deportación, hubo permanencia superior al tiempo permitido o nadie tiene pasaporte vigente. Para los demás, renovación corresponde a Alto/A; primera vez con viajes a EE. UU./Canadá/Europa/Australia/Asia y visa previa de EE. UU./Canadá/Australia corresponde a Alto/A; los mismos viajes con ninguna visa o una visa de otros destinos corresponden a Medio-Alto/B; primera vez sin visa previa ni esos viajes corresponde a Medio/C. En el nuevo cálculo D tiene prioridad sobre las otras rutas para evitar resultados simultáneos. La ruta de renovación actual de ActiveCampaign no aplica esta prioridad global por sí sola.

El cruce de primera vez con visa previa fuerte o de otros destinos, pero sin viajes a destinos principales, no tiene ruta inequívoca en las automatizaciones observadas. La V2 lo marca `PENDIENTE` y no asigna correo hasta que se apruebe la regla. La composición del grupo y los lazos familiares modifican variantes del correo en algunas rutas, pero no cambian A/B/C/D. El contenido definitivo de esos correos debe revisarse antes de conectar envíos.

Para poner el estudio en producción: persistir respuesta y clasificación en Baserow con idempotencia por persona y evento; aplicar la primera clasificación de manera global; enlazar el contacto de ActiveCampaign; enviar solo el correo de esa primera clasificación; actualizar el CRM; y decidir el siguiente mensaje de WhatsApp desde los hitos realmente enviados. El formulario 7 y sus automatizaciones actuales deben seguir funcionando mientras se valida el reemplazo.
