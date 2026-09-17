# Acceso privado del CRM

El estudio de perfil (`/estudio` y `/api/estudio`) permanece público. Las pantallas del CRM y las futuras rutas `/api/` quedan protegidas al activar `CRM_AUTH_ENABLED=true`. El CRM todavía presenta datos de demostración.

## Crear una cuenta

En una terminal privada, ejecutar `node scripts/create-crm-user.mjs asesor1 "Nombre del asesor" admin` para la primera cuenta, o usar el rol `asesor` para las siguientes. La herramienta pide una contraseña de 14 caracteres como mínimo sin mostrarla y entrega un objeto JSON con un hash scrypt y sal aleatoria. Nunca guardar la contraseña ni ese objeto en Git.

En Vercel, configurar las variables privadas `AUTH_SECRET` (valor aleatorio de al menos 32 bytes) y `CRM_USERS_JSON` (un arreglo JSON que contenga los objetos generados). Confirmar que existe al menos una cuenta activa; luego activar `CRM_AUTH_ENABLED=true`, redesplegar y probar el inicio de sesión. Si la configuración está incompleta, el CRM permanece cerrado y el estudio sigue disponible. Solo las personas con acceso administrativo a Vercel deben editar estas variables. No usar prefijos `NEXT_PUBLIC_`.

Para añadir una cuenta, generar otro objeto y sumarlo al arreglo de `CRM_USERS_JSON`; para bloquearla, establecer `active:false` o eliminarla. Para cambiar una contraseña, generar un nuevo hash para ese usuario. El cambio entra en vigor después del nuevo despliegue y anula su sesión previa. Las sesiones duran como máximo 12 horas.

No existe registro público ni recuperación automática de contraseñas. Las asignaciones de leads entre asesores siguen pendientes; el campo `ASESOR` del modelo ya está previsto. Antes de conectar datos reales, comprobar el inicio de sesión, el cierre de sesión, el bloqueo de rutas sin sesión, y una regla de límite de intentos para el acceso en Vercel.

