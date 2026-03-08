# 🌟 Arquitectura y Diseño del Sistema: CRM Tu Visa Mundo

Este documento describe la estructura fundamental, flujo de datos y reglas de negocio del CRM de Tu Visa Mundo, desarrollado nativamente en `Python` usando el framework `Streamlit` y potenciado por la `API de Google Sheets`.

## 1. Stack Tecnológico
- **Frontend / Backend Lógico:** Python + Streamlit (`streamlit`).
- **Data Wrangling:** Pandas (`pandas`).
- **Base de Datos:** Google Sheets a través de Google API Client (`google-api-python-client`, `google-auth`).
- **Resiliencia y Caché:** Manejo local con `st.cache_data` y reintentos (Retries) utilizando la librería `tenacity`.

## 2. Modelado de Datos (Google Sheets como Base de Datos)
El estado de la aplicación reside enteramente en hojas de cálculo de Google. Existen 3 repositorios principales:

### A. Spreadsheet "Asesores"
- **Pestaña obligatoria:** `Diana Londoño`
- **Lógica de Asignación:** Todo teléfono (columna `WHATSAPP`) encontrado aquí se asigna al perfil de Diana. Cualquier número que NO esté en esta lista es asignado automáticamente por descarte a Augusto.

### B. Spreadsheet "Leads Registro"
- **Pestañas (Destinos):** `Canadá`, `Australia`, `Reino Unido`, `EEUU`, `Otros Destinos`.
- **Estructura Crítica Exigida:** El archivo escribe en las columnas **F, G, H**:
  - `Columna F` (CONTACTADO): Almacenará `SÍ`, `VENTA`, `PERDIDO` o vacío.  
  - `Columna G` (ULTIMO_MENSAJE): Índice del último paso de Drip Campaign completado (Ej. 0, 1, 2).
  - `Columna H` (FECHA_ULTIMO_MENSAJE): Estampa de tiempo (YYYY-MM-DD).

### C. Spreadsheet "Leads Estudios"
- **Pestañas (Perfiles):** `Perfil ALTO / 1ra VEZ`, `Perfil ALTO / RENOVACION`, `Perfil MEDIO / ALTO`, `Perfil MEDIO`, `Perfil BAJO`.
- **Estructura Crítica Exigida:** El archivo escribe en las columnas **K, L, M**:
  - `Columna K` (CONTACTADO): Almacenará `SÍ`, `VENTA`, `PERDIDO` o vacío.
  - `Columna L` (ULTIMO_MENSAJE): Índice numérico.
  - `Columna M` (FECHA_ULTIMO_MENSAJE): Exclusivo para fechas.

---

## 3. Lógica de Seguimiento / Drip Campaign
El sistema automatiza un embudo conversacional o *Drip Campaign* de acuerdo a un calendario estricto de días.

### Reglas de Negocio Centrales
1. **Compensación de Fin de Semana (Business Days):** Si el cálculo matemático predice que el día exacto para enviar el siguiente mensaje de seguimiento cae un Sábado o Domingo, el sistema desplaza automáticamente el envío para el Lunes siguiente.
2. **Plantillas Multipropósito:** El programa inyecta nombre de asesor, banderas y links del destino o perfil detectado evaluando de manera dinámica el nombre de la pestaña de origen.
3. **Cortes de Embudo:** Si en la pestaña de seguimiento se presiona "Venta Realizada" o "Lead Perdido", la celda CONTACTADO abandonará el estado `SÍ` pasando a `VENTA` o `PERDIDO`. Esto los excluye matemáticamente del filtro de envío futuro pero los retiene en los informes históricos.

### Ciclos de Envío de Mensajes
#### Para Solo Registro (Filtro por Destino)
La matriz de envío es: **`[0, 1, 4, 10, 20, 40]`** días de diferencia desde el mensaje 0.
- **Mensaje 1 (Día 0):** Bienvenida y perfilamiento rápido.
- **Mensaje 2 (Día 1):** Recordatorio interactivo.
- **Mensaje 3 (Día 4):** Video educativo sin entrevista.
- **Mensaje 4 (Día 10):** Testimonios de clientes.
- **Mensaje 5 (Día 20):** Blog / Carta de intención de viaje.
- **Mensaje 6 (Día 40):** Artículo del diario Perfil.

#### Para Estudios de Perfil (Filtro por Calificación)
La matriz de envío es: **`[0, 2, 8, 20, 30, 45, 60]`** días de diferencia.
- **Mensaje 1 (Día 0):** Bienvenida de prospectos perfilados.
- **Mensaje 2 (Día 2):** Video según Perfil Medio o Alto.
- **Mensaje 3 (Día 8):** Testimonios web.
- **Mensaje 4 (Día 20):** Reel de 3 Errores de Instagram.
- **Mensaje 5 (Día 30):** Oferta especial (Descuento temporal).
- **Mensaje 6 (Día 45):** Video de caso especial complejo (Ana y su hija).
- **Mensaje 7 (Día 60):** Landing de comparación de Servicio Basic vs Premium.

---

## 4. Estructura de Directorios

- `crm_app.py` *(Punto de entrada lógico principal y UI de Streamlit)*
- `messages_config.py` *(Motor de inyección de variables, reglas DRY y strings formados).*
- `logo_tvm.png` *(Identidad gráfica en la barra lateral).*
- Archivos `.txt` *(Fuente de la verdad local y documentación secundaria de mensajes).*
