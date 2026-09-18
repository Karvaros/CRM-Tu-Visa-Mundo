# Revisión final de seguridad

Revisar este punto con Astra **después de terminar los demás pendientes del embudo**. La revisión no detiene ahora el trabajo en mensajes.

Estado al 18 de septiembre de 2026: CRM con acceso privado; claves de Baserow y ActiveCampaign en el servidor; clasificación del estudio en el servidor; firma del webhook de formularios; y límites independientes de cinco solicitudes por IP cada diez minutos para el estudio y el acceso al CRM, comprobados en producción.

En esa revisión final, evaluar el posible abuso mediante muchos correos o redes distintas, la conveniencia de una segunda verificación para las cuentas del CRM, los permisos y las copias de seguridad de Baserow y ActiveCampaign, y la respuesta cuando el servicio de límites de Vercel no esté disponible. Decidir las medidas según el tráfico y los incidentes reales, sin añadir fricción innecesaria al estudio.

