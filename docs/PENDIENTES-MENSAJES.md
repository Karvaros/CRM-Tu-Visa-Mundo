# Pendientes de mensajes y secuencias

Este documento reúne las decisiones y recursos que todavía faltan. Los mensajes afectados permanecen con `REQUIERE_REVISION=true`, por lo que HOY no permite copiarlos, abrirlos en WhatsApp ni confirmarlos como enviados.

## Datos y decisiones para pedir al propietario

No hace falta reunirlos todos ahora. Cuando se retome un mensaje, pedir únicamente lo que corresponda:

1. **Reel «Tres errores comunes» (Canadá):** URL definitiva de Instagram.
2. **Caso de Ana y su hija (Canadá):** URL definitiva del video de YouTube.
3. **Comparación Basic/Premium (Canadá):** texto y enlace del video «Beneficios del Plan Basic», o confirmación de que ese video no se incluirá. El enlace de la página comparativa ya existe.
4. **Oferta del 25 % (Canadá):** duración del descuento contada desde el envío, tratamiento de fines de semana e imagen que acompañará el mensaje. La fecha exacta se calculará al enviarlo.
5. **Artículo en Perfil (Reino Unido):** confirmar el enlace específico antes de habilitar ese mensaje.
6. **Bienvenida posestudio (Canadá):** confirmar si se elimina o se reescribe; el texto actual habla de registro y por eso está bloqueado. La secuencia activa entra directamente por el resultado A/B/C.
7. **Australia, Estados Unidos y Reino Unido después de testimonios:** aportar o aprobar los próximos mensajes y sus recursos. Por ahora esas secuencias terminan en testimonios.

La revisión individual de estudios antiguos en atención manual y las equivalencias entre hitos son tareas de configuración del CRM, no datos que el propietario tenga que buscar.

## Estado revisado el 18 de septiembre de 2026

MENSAJES contiene 45 plantillas: 24 SIN ESTUDIO (seis por destino), nueve ESTUDIO de Canadá y cuatro para cada uno de Australia, Estados Unidos y Reino Unido. Con aprobación del propietario se reutilizaron los textos genéricos A/B/C de resultado y testimonios, cada uno en una secuencia propia del destino. Los resultados apuntan al video general del trámite; testimonios apunta a la página de Tu Visa Mundo. Para cada destino, el estudio A/B/C selecciona el mensaje de resultado de orden 2 y, tras confirmar su envío por WhatsApp, el CRM programa testimonios de orden 3 desde la fecha real de ese envío. El perfil D no tiene secuencia comercial.

En Canadá siguen bloqueados para revisión la bienvenida posestudio, el Reel de tres errores, la oferta del 25 %, el caso de Ana y su hija y la comparación Basic/Premium. El artículo de Perfil para Reino Unido también sigue bloqueado hasta confirmar su URL. Los demás enlaces ya registrados no deben confundirse con estos recursos faltantes.

## Recursos pendientes

- **Tres errores comunes:** agregar la URL definitiva del Reel de Instagram.
- **Caso de Ana y su hija:** agregar la URL definitiva del video de YouTube.
- **Beneficios del Plan Basic:** definir el texto del mensaje y la URL del video mencionado en el archivo original.
- **Artículo en Perfil para Reino Unido:** confirmar que la URL específica de Reino Unido existe y es la que debe enviarse.

## Oferta del 25 %

El mensaje se conserva. Su fecha límite depende del momento real en que se envíe, por lo que no debe escribirse una fecha fija en la plantilla.

Antes de habilitarlo falta definir:

- Cuántos días permanece vigente la oferta desde el envío.
- Si la fecha límite incluye fines de semana.
- La imagen que acompañará el mensaje.
- El formato con el que el CRM insertará la fecha calculada en el texto final y en la copia histórica de la interacción.

## Nombre del asesor

Las referencias a Augusto se conservan porque representan el nombre del asesor que envía el mensaje. Esto es independiente de la prohibición de usar el nombre del destinatario en mensajes de difusión. Cuando se implemente multiusuario, el nombre del asesor deberá provenir del campo `ASESOR` o de la configuración de la sesión.

## Estudio gratuito y estudio pago

- Los mensajes automáticos de SIN ESTUDIO conducen a `https://www.tuvisamundo.com/estudio-de-perfil-en-linea/`.
- Esa misma página alojará las opciones del estudio que se construyan más adelante.
- El estudio pago no se ofrecerá mediante una secuencia automática.
- Un asesor lo ofrecerá manualmente cuando un lead solicite acompañamiento para realizar el estudio. Esto permite identificar una intención real antes de dedicar tiempo del equipo.
- El CRM registrará la modalidad elegida mediante `TIPO_ESTUDIO`, aunque no exista una secuencia comercial para la modalidad paga.

## Paso de SIN ESTUDIO a A/B/C

La bienvenida del grupo ESTUDIO no debe repetirse cuando el lead ya recorrió SIN ESTUDIO.

- ActiveCampaign envía el resultado del estudio por correo; ese correo no cuenta como WhatsApp enviado. El CRM entra por el mensaje 2: Alto para A, Medio Alto para B o Medio para C.
- Solo si existe una confirmación de envío del resultado por WhatsApp en INTERACCIONES, el CRM entra por el mensaje 3.
- Si ya se confirmó el envío de testimonios en SIN ESTUDIO, se omite el mismo hito en ESTUDIO.
- La primera respuesta válida fija la clasificación del lead. Un estudio posterior se registra como repetido, pero no cambia A/B/C, no reinicia la secuencia y no vuelve a enviar el resultado.

La equivalencia de otros hitos futuros entre SIN ESTUDIO y ESTUDIO sigue pendiente. No se infiere un envío de WhatsApp a partir de un correo de ActiveCampaign, de abrir WhatsApp ni de copiar el texto. Los estudios de Australia, Estados Unidos y Reino Unido registrados antes de esta asignación deben revisarse individualmente antes de incorporarlos a la secuencia: algunos están en atención manual y no se debe sobrescribir una decisión del asesor.

## Correcciones resueltas

- Página de trámite de Canadá confirmada.
- Página de trámite de Australia corregida en los mensajes 3 y 5.
- Texto de Estados Unidos corregido para no mencionar Canadá.
- Página de trámite de Estados Unidos corregida.
- Página de trámite de Reino Unido corregida.
- Página de testimonios agregada a la secuencia ESTUDIO.
