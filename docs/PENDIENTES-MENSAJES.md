# Pendientes de mensajes y secuencias

Este documento reúne las decisiones y recursos que todavía faltan. Los mensajes afectados permanecen con `REQUIERE_REVISION=true`, por lo que HOY no permite copiarlos, abrirlos en WhatsApp ni confirmarlos como enviados.

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

- Si ActiveCampaign informa la clasificación pero todavía no envió el resultado específico por WhatsApp, el CRM entra por el mensaje 2: Alto/Medio-Alto para A/B o Medio para C.
- Si ActiveCampaign ya envió ese resultado por WhatsApp, el CRM entra por el mensaje 3.
- Después se omiten los hitos que ya haya recibido el lead dentro de SIN ESTUDIO.
- La primera respuesta válida fija la clasificación del lead. Un estudio posterior se registra como repetido, pero no cambia A/B/C, no reinicia la secuencia y no vuelve a enviar el resultado.

Cuando corresponda integrar ActiveCampaign, primero se revisarán en modo lectura la versión inicial del estudio, sus campos y la automatización que distribuye las calificaciones. Falta definir la tabla exacta de equivalencias entre los mensajes posteriores de ambas secuencias, el identificador estable del primer estudio y el dato con el que ActiveCampaign confirmará si el resultado fue enviado por WhatsApp.

## Correcciones resueltas

- Página de trámite de Canadá confirmada.
- Página de trámite de Australia corregida en los mensajes 3 y 5.
- Texto de Estados Unidos corregido para no mencionar Canadá.
- Página de trámite de Estados Unidos corregida.
- Página de trámite de Reino Unido corregida.
- Página de testimonios agregada a la secuencia ESTUDIO.
