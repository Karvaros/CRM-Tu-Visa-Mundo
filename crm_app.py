import streamlit as st
import pandas as pd
import sys
import time
from datetime import datetime, timedelta
from messages_config import get_drip_message, get_drip_message_perfil, get_next_business_day, DRIP_DAYS_REGISTRO, DRIP_DAYS_PERFIL
from tenacity import retry, wait_fixed, stop_after_attempt, retry_if_exception_type
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

st.set_page_config(page_title="CRM Tu Visa Mundo", layout="wide")

# CSS para los degradados azules corporativos
st.markdown("""
<style>
    /* Fondo principal */
    .stApp {
        background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
        color: white;
    }
    
    /* Sidebar */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #141E30, #243B55);
        color: white;
    }
    
    /* Textos generales */
    h1, h2, h3, h4, p, label {
        color: #ffffff !important;
    }
    
    /* Tarjetas de leads */
    div[data-testid="stVerticalBlock"] > div > div > div.element-container > div.stMarkdown > div > div > div.lead-card {
        background: linear-gradient(145deg, #1c334b, #2b4c6f);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 15px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        border: 1px solid #3d6a99;
        color: white;
    }
    
    /* Botones primarios */
    .stButton > button {
        background: linear-gradient(90deg, #8cbbe8 0%, #afd5fa 100%);
        color: #1a2a3a !important;
        font-weight: bold;
        border: none;
        border-radius: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .stButton > button:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(140,187,232,0.5);
        background: linear-gradient(90deg, #afd5fa 0%, #8cbbe8 100%);
    }
    
    /* Forzar el color del texto interno del botón */
    .stButton > button * {
        color: #1a2a3a !important;
        font-weight: bold !important;
    }
    
    /* Estilos de tabla/DataFrame */
    .dataframe th {
        background-color: #1e3c72;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Configuraciones de Google Sheets
SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = 'G:/Otros ordenadores/Mi Portátil/VISAS/DOCUMENTOS ANTIGRAVITY/antigravity-sheets-489515-72fbbabba49d.json'

SHEET_REGISTRO = '172qo71ftKa2Cq0uAmyI851tAFpVxivlt8rVi4gFgRVA'
TABS_REGISTRO = ['Canadá', 'Australia', 'Reino Unido', 'EEUU', 'Otros Destinos']

SHEET_ESTUDIO = '1dLcGI_iTbjJjhTdP34XZ1zYs6VBKZ8STkmBPAorYR8s'
TABS_ESTUDIO = ['Perfil ALTO / 1ra VEZ', 'Perfil ALTO / RENOVACION', 'Perfil MEDIO / ALTO', 'Perfil MEDIO', 'Perfil BAJO']

SHEET_ASESORES = '17pal_t6fT3cXZ7yKu4K0bcuBhaCr1Ww8SlMcG1CnNQI'

@st.cache_resource
def get_services():
    if "gcp_service_account" in st.secrets:
        # Estamos en la nube de Streamlit
        creds = Credentials.from_service_account_info(st.secrets["gcp_service_account"], scopes=SCOPES)
    else:
        # Estamos corriendo localmente en Windows
        creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        
    sheets_service = build('sheets', 'v4', credentials=creds)
    return sheets_service

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2), retry=retry_if_exception_type(Exception))
def fetch_data(sheets_service, spreadsheet_id, range_name):
    result = sheets_service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    values = result.get('values', [])
    if not values or len(values) <= 1: # if only headers or completely empty
        return pd.DataFrame()
    
    # Asumimos que la fila 1 es header
    headers = values[0]
    data = values[1:]
    
    # Pad rows that are shorter than the header length
    padded_data = []
    for row in data:
        row_length = len(row)
        header_length = len(headers)
        if row_length < header_length:
            row.extend([''] * (header_length - row_length))
        elif row_length > header_length:
            row = row[:header_length]
        padded_data.append(row)
    
    df = pd.DataFrame(padded_data, columns=headers)
    # Rellenar CONTACTADO si falta
    if 'CONTACTADO' not in df.columns:
        df['CONTACTADO'] = ""
    else:
        df['CONTACTADO'] = df['CONTACTADO'].fillna("").astype(str).str.strip().str.upper()
        
    if 'ULTIMO_MENSAJE' not in df.columns:
        df['ULTIMO_MENSAJE'] = -1
    else:
        df['ULTIMO_MENSAJE'] = pd.to_numeric(df['ULTIMO_MENSAJE'], errors='coerce').fillna(-1).astype(int)
        
    if 'FECHA_ULTIMO_MENSAJE' not in df.columns:
        df['FECHA_ULTIMO_MENSAJE'] = ""
    else:
        df['FECHA_ULTIMO_MENSAJE'] = df['FECHA_ULTIMO_MENSAJE'].fillna("").astype(str)
        
    df['ROW_INDEX'] = range(2, len(data) + 2) # Fila real en la hoja
    return df

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2), retry=retry_if_exception_type(Exception))
def update_cell(sheets_service, spreadsheet_id, tab_name, row_index, start_col_letter, end_col_letter, values_list):
    range_name = f"'{tab_name}'!{start_col_letter}{row_index}:{end_col_letter}{row_index}"
    body = {'values': [values_list]}
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id, range=range_name,
        valueInputOption="USER_ENTERED", body=body).execute()

@st.cache_data(ttl=600, show_spinner=False)
def get_cached_data():
    sheets_service = get_services()
    
    # Cargar Diana
    try:
        df_diana = fetch_data(sheets_service, SHEET_ASESORES, "'Diana Londoño'!A:Z")
    except Exception as e:
        df_diana = pd.DataFrame()
        
    diana_phones = []
    if not df_diana.empty and 'WHATSAPP' in df_diana.columns:
        diana_phones = [str(p).strip() for p in df_diana['WHATSAPP'].tolist() if str(p).strip() != ""]
        
    # Cargar Registros
    registros = {}
    for tab in TABS_REGISTRO:
        try:
            df = fetch_data(sheets_service, SHEET_REGISTRO, f"'{tab}'!A:Z")
            registros[tab] = df # Store even if empty DataFrame so the UI knows the dataframe exists but it is empty.
        except Exception as e:
            registros[tab] = pd.DataFrame()
            
    # Cargar Estudios
    estudios = {}
    for tab in TABS_ESTUDIO:
        try:
            df = fetch_data(sheets_service, SHEET_ESTUDIO, f"'{tab}'!A:Z")
            estudios[tab] = df
        except Exception as e:
            estudios[tab] = pd.DataFrame()
            
    return diana_phones, registros, estudios

def load_all_data():
    sheets_service = get_services()
    diana_phones, registros, estudios = get_cached_data()
    return sheets_service, diana_phones, registros, estudios

def assign_leads(df, diana_phones):
    if df is None or df.empty or 'WHATSAPP' not in df.columns:
        return df, df # If empty or missing whatsapp, return same empty df
    
    df['WHATSAPP_CLEAN'] = df['WHATSAPP'].astype(str).str.strip()
    
    # Filtro: esta en Diana?
    mask_diana = df['WHATSAPP_CLEAN'].isin(diana_phones)
    
    df_diana = df[mask_diana].copy()
    df_augusto = df[~mask_diana].copy()
    return df_diana, df_augusto

def show_lead_card(idx, lead, tab_name, sheet_id, col_contactado, sheets_service, is_historial=False, mode="normal", drip_step=0, asesor_name="Augusto"):
    st.markdown(f'<div class="lead-card">', unsafe_allow_html=True)
    cols = st.columns([3, 1])
    
    with cols[0]:
        nombre = f"{lead.get('NOMBRE', '')} {lead.get('APELLIDO', '')}"
        st.subheader(f"👤 {nombre}")
        
        if is_historial:
            info_parts = []
            info_parts.append(f"**WhatsApp:** {lead.get('WHATSAPP', '')}")
            if 'CORREO' in lead and pd.notna(lead['CORREO']) and str(lead['CORREO']).strip() != "":
                info_parts.append(f"**Correo:** {lead.get('CORREO', '')}")
            if 'FECHA' in lead and pd.notna(lead['FECHA']) and str(lead['FECHA']).strip() != "":
                info_parts.append(f"**Fecha:** {lead.get('FECHA', '')}")
            
            for col in lead.index:
                if col not in ['NOMBRE', 'APELLIDO', 'WHATSAPP', 'WHATSAPP_CLEAN', 'CORREO', 'FECHA', 'CONTACTADO', 'ROW_INDEX', 'TAB_ORIGINAL', 'ULTIMO_MENSAJE', 'FECHA_ULTIMO_MENSAJE']:
                    if pd.notna(lead[col]) and str(lead[col]).strip() != "":
                        info_parts.append(f"**{col}:** {lead[col]}")
            
            st.markdown(" &nbsp;&nbsp;|&nbsp;&nbsp; ".join(info_parts))
        else:
            st.write(f"**WhatsApp:** {lead.get('WHATSAPP', '')}")
            if 'CORREO' in lead:
                st.write(f"**Correo:** {lead.get('CORREO', '')}")
                
            st.write(f"**Fecha:** {lead.get('FECHA', '')}")
            
            # Muestra campos extra
            for col in lead.index:
                if col not in ['NOMBRE', 'APELLIDO', 'WHATSAPP', 'WHATSAPP_CLEAN', 'CORREO', 'FECHA', 'CONTACTADO', 'ROW_INDEX', 'TAB_ORIGINAL', 'ULTIMO_MENSAJE', 'FECHA_ULTIMO_MENSAJE']:
                    if pd.notna(lead[col]) and str(lead[col]).strip() != "":
                        st.write(f"**{col}:** {lead[col]}")
                        
        if mode == "seguimiento":
            st.markdown(f"**👉 Día {DRIP_DAYS_REGISTRO[drip_step]} - Mensaje {drip_step + 1}**")
            # Mostrar la plantilla del mensaje
            plantilla = get_drip_message(lead.get('TAB_ORIGINAL', ''), drip_step, asesor_name)
            st.code(plantilla, language="markdown")
            
        elif mode == "seguimiento_perfil":
            st.markdown(f"**👉 Día {DRIP_DAYS_PERFIL[drip_step]} - Mensaje {drip_step + 1}**")
            plantilla = get_drip_message_perfil(lead.get('TAB_ORIGINAL', ''), drip_step, asesor_name)
            st.code(plantilla, language="markdown")
    
    with cols[1]:
        val_contacto = str(lead.get('CONTACTADO', '')).strip().upper()
        
        if mode == "normal":
            if val_contacto == 'SÍ':
                st.success("✅ Ya Contactado")
            elif val_contacto == 'VENTA':
                st.success("🏆 Venta Realizada")
            elif val_contacto == 'PERDIDO':
                st.error("❌ Lead Perdido")
            else:
                if st.button("Marcar como Contactado", key=f"btn_{tab_name}_{lead['ROW_INDEX']}_{mode}"):
                    with st.spinner("Actualizando..."):
                        today_str = datetime.now().strftime('%Y-%m-%d')
                        if col_contactado == 'F':
                            update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'F', 'H', ["SÍ", 0, today_str])
                        else:
                            update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'K', 'M', ["SÍ", 0, today_str])
                    st.success("¡Actualizado! Refresca para ver en Historial.")
                    st.cache_data.clear()
                    time.sleep(1)
                    st.rerun()
        elif mode == "seguimiento" or mode == "seguimiento_perfil":
            if st.button(f"Enviar Mensaje {drip_step + 1}", key=f"btn_drip_{tab_name}_{lead['ROW_INDEX']}_{drip_step}_{mode}"):
                with st.spinner("Actualizando Tracking..."):
                    today_str = datetime.now().strftime('%Y-%m-%d')
                    if col_contactado == 'F':
                        update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'F', 'H', ["SÍ", drip_step, today_str])
                    else:
                        update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'K', 'M', ["SÍ", drip_step, today_str])
                st.success("¡Siguiente mensaje programado!")
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
                
            if st.button("🏆 Venta Realizada", key=f"btn_venta_{tab_name}_{lead['ROW_INDEX']}_{mode}"):
                with st.spinner("Actualizando estado..."):
                    today_str = datetime.now().strftime('%Y-%m-%d')
                    if col_contactado == 'F':
                        update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'F', 'H', ["VENTA", drip_step, today_str])
                    else:
                        update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'K', 'M', ["VENTA", drip_step, today_str])
                st.success("¡Felicidades por la venta!")
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
                
            if st.button("❌ Lead Perdido", key=f"btn_perdido_{tab_name}_{lead['ROW_INDEX']}_{mode}"):
                with st.spinner("Actualizando estado..."):
                    today_str = datetime.now().strftime('%Y-%m-%d')
                    if col_contactado == 'F':
                        update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'F', 'H', ["PERDIDO", drip_step, today_str])
                    else:
                        update_cell(sheets_service, sheet_id, tab_name, lead['ROW_INDEX'], 'K', 'M', ["PERDIDO", drip_step, today_str])
                st.success("Lead retirado del seguimiento.")
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
                
    st.markdown("</div>", unsafe_allow_html=True)

# Main App
def main():
    # El logo proveído asume estar en la misma ruta que el script (GitHub repo o local)
    try:
        st.sidebar.image("logo_tvm.png", width=180) 
    except Exception as e:
        pass

    st.sidebar.title("Menú Asesores")
    asesor = st.sidebar.radio("Selecciona Asesor:", ["Diana", "Augusto"])
    
    if st.sidebar.button("🔄 Refrescar Datos"):
        st.cache_data.clear()
        st.cache_resource.clear()
        st.rerun()

    st.title("CRM Tu Visa Mundo")
    
    # --- HELPER DATES FUNCTION ---
    def filter_by_date(df, date_option):
        if 'FECHA' not in df.columns:
            return df
            
        # Intentar convertir FECHA a datetime para poder filtrar
        # Suponiendo formato ej: dd/mm/yyyy o yyyy-mm-dd
        df_temp = df.copy()
        df_temp['FECHA_DT'] = pd.to_datetime(df_temp['FECHA'], errors='coerce', dayfirst=True)
        
        today = datetime.now()
        
        if date_option == "Últimos 7 días":
            cutoff = today - timedelta(days=7)
            return df_temp[df_temp['FECHA_DT'] >= cutoff].drop(columns=['FECHA_DT'])
        elif date_option == "Últimos 15 días":
            cutoff = today - timedelta(days=15)
            return df_temp[df_temp['FECHA_DT'] >= cutoff].drop(columns=['FECHA_DT'])
        elif date_option == "Últimos 30 días":
            cutoff = today - timedelta(days=30)
            return df_temp[df_temp['FECHA_DT'] >= cutoff].drop(columns=['FECHA_DT'])
        elif date_option == "Personalizado (Calendario)":
            cols = st.columns(2)
            fecha_inicio = cols[0].date_input("Fecha Inicio", value=today - timedelta(days=7))
            fecha_fin = cols[1].date_input("Fecha Fin", value=today)
            
            # Formatear a datetime para comparar
            start_dt = pd.to_datetime(fecha_inicio)
            end_dt = pd.to_datetime(fecha_fin) + timedelta(days=1, microseconds=-1) # Hasta el final del día
            
            mask = (df_temp['FECHA_DT'] >= start_dt) & (df_temp['FECHA_DT'] <= end_dt)
            return df_temp[mask].drop(columns=['FECHA_DT'])
            
        return df_temp.drop(columns=['FECHA_DT']) # "Historial Completo"
    
    with st.spinner("Cargando datos desde Google Sheets..."):
        sheets_service, diana_phones, registros, estudios = load_all_data()
        
    if 'current_tab' not in st.session_state:
        st.session_state['current_tab'] = "Solo Registro"
        
    st.markdown("<br>", unsafe_allow_html=True)
    col1, col2, col3, _ = st.columns([1, 1, 1, 1])
    with col1:
        if st.button("Solo Registro", use_container_width=True):
            st.session_state['current_tab'] = "Solo Registro"
    with col2:
        if st.button("Estudios de Perfil", use_container_width=True):
            st.session_state['current_tab'] = "Estudios de Perfil"
    with col3:
        if st.button("Seguimiento", use_container_width=True):
            st.session_state['current_tab'] = "Seguimiento"
            
    st.markdown("---")
    
    # --- PESTAÑA SOLO REGISTRO ---
    if st.session_state['current_tab'] == "Solo Registro":
        st.header("Leads de Solo Registro")
        
        # Agregamos "Todos" al inicio de las opciones
        opciones_registro = ["Todos"] + TABS_REGISTRO
        selected_pais = st.selectbox("Selecciona País/Destino:", opciones_registro)
        
        df_pais = pd.DataFrame()
        
        if selected_pais == "Todos":
            # Si es Todos, pegamos todos los dataframes y le agregamos una columna indicando el origen
            dfs_to_concat = []
            for tab, df_tab in registros.items():
                if df_tab is not None and not df_tab.empty:
                    df_temp = df_tab.copy()
                    df_temp['Destino'] = tab
                    df_temp['TAB_ORIGINAL'] = tab # Para saber en qué hoja escribir si lo marcamos como contactado
                    dfs_to_concat.append(df_temp)
            if dfs_to_concat:
                df_pais = pd.concat(dfs_to_concat, ignore_index=True)
        else:
            if selected_pais in registros:
                df_pais = registros[selected_pais]
                if df_pais is not None and not df_pais.empty:
                    df_pais = df_pais.copy()
                    df_pais['Destino'] = selected_pais
                    df_pais['TAB_ORIGINAL'] = selected_pais
        
        # Procesar df agrupado o individual si existe
        if df_pais is not None and not df_pais.empty:
            df_diana, df_augusto = assign_leads(df_pais, diana_phones)
            
            df_view = df_diana if asesor == "Diana" else df_augusto
            
            vista_tipo = st.radio("Secciones:", ["Nuevos Leads", "Historial (Contactados)"], key="rad_reg", horizontal=True)
            
            if vista_tipo == "Nuevos Leads":
                df_mostrar = df_view[~df_view['CONTACTADO'].isin(['SÍ', 'VENTA', 'PERDIDO'])]
                st.write(f"**Total Pendientes ({asesor}): {len(df_mostrar)}**")
            else:
                st.markdown("### Informes de Historial")
                rango_fechas = st.selectbox(
                    "Filtrar por fecha de registro:", 
                    ["Historial Completo", "Últimos 7 días", "Últimos 15 días", "Últimos 30 días", "Personalizado (Calendario)"],
                    key="date_reg"
                )
                
                df_historial = df_view[df_view['CONTACTADO'].isin(['SÍ', 'VENTA', 'PERDIDO'])]
                df_mostrar = filter_by_date(df_historial, rango_fechas)
                
                st.info(f"📊 **Total Leads Contactados en este periodo ({asesor}): {len(df_mostrar)}**")
                
            if not df_mostrar.empty:
                is_hist = (vista_tipo == "Historial (Contactados)")
                for idx, lead in df_mostrar.iterrows():
                    # En SOLO REGISTRO, la col CONTACTADO es la F
                    # Usamos lead['TAB_ORIGINAL'] para que cuando escriba sepa la hoja verdadera que le corresponde independientemente si estamos en "Todos" o un pais específico.
                    tab_to_update = lead.get('TAB_ORIGINAL', selected_pais) 
                    show_lead_card(idx, lead, tab_to_update, SHEET_REGISTRO, 'F', sheets_service, is_historial=is_hist)
            else:
                st.info("No hay leads en esta sección.")
        else:
            st.info("No hay datos cargados (Posiblemente la pestaña original de Google Sheets esté en blanco a excepción de los encabezados).")

    # --- PESTAÑA ESTUDIO DE PERFIL ---
    elif st.session_state['current_tab'] == "Estudios de Perfil":
        st.header("Leads de Estudio de Perfil")
        
        # Agregamos "Perfil APLICABLES" al inicio
        opciones_estudio = ["Perfil APLICABLES"] + TABS_ESTUDIO
        selected_perfil = st.selectbox("Selecciona Nivel de Perfil:", opciones_estudio)
        
        df_perfil = pd.DataFrame()
        
        if selected_perfil == "Perfil APLICABLES":
            # Perfiles aplicables no incluye "Perfil BAJO"
            perfiles_aplicables = ['Perfil ALTO / 1ra VEZ', 'Perfil ALTO / RENOVACION', 'Perfil MEDIO / ALTO', 'Perfil MEDIO']
            dfs_to_concat = []
            for tab, df_tab in estudios.items():
                if tab in perfiles_aplicables and df_tab is not None and not df_tab.empty:
                    df_temp = df_tab.copy()
                    df_temp['Perfil'] = tab
                    df_temp['TAB_ORIGINAL'] = tab
                    dfs_to_concat.append(df_temp)
            if dfs_to_concat:
                df_perfil = pd.concat(dfs_to_concat, ignore_index=True)
        else:
            if selected_perfil in estudios:
                df_perfil = estudios[selected_perfil]
                if df_perfil is not None and not df_perfil.empty:
                    df_perfil = df_perfil.copy()
                    df_perfil['Perfil'] = selected_perfil
                    df_perfil['TAB_ORIGINAL'] = selected_perfil
        
        if df_perfil is not None and not df_perfil.empty:
            df_diana, df_augusto = assign_leads(df_perfil, diana_phones)
            
            df_view = df_diana if asesor == "Diana" else df_augusto
            
            vista_tipo = st.radio("Secciones:", ["Nuevos Leads", "Historial (Contactados)"], key="rad_est", horizontal=True)
            
            if vista_tipo == "Nuevos Leads":
                df_mostrar = df_view[~df_view['CONTACTADO'].isin(['SÍ', 'VENTA', 'PERDIDO'])]
                st.write(f"**Total Pendientes ({asesor}): {len(df_mostrar)}**")
            else:
                st.markdown("### Informes de Historial")
                rango_fechas = st.selectbox(
                    "Filtrar por fecha de registro:", 
                    ["Historial Completo", "Últimos 7 días", "Últimos 15 días", "Últimos 30 días", "Personalizado (Calendario)"],
                    key="date_est"
                )
                
                df_historial = df_view[df_view['CONTACTADO'].isin(['SÍ', 'VENTA', 'PERDIDO'])]
                df_mostrar = filter_by_date(df_historial, rango_fechas)
                
                st.info(f"📊 **Total Leads Contactados en este periodo ({asesor}): {len(df_mostrar)}**")
                
            if not df_mostrar.empty:
                is_hist = (vista_tipo == "Historial (Contactados)")
                for idx, lead in df_mostrar.iterrows():
                    # En ESTUDIO, la col CONTACTADO es la K
                    tab_to_update = lead.get('TAB_ORIGINAL', selected_perfil)
                    show_lead_card(idx, lead, tab_to_update, SHEET_ESTUDIO, 'K', sheets_service, is_historial=is_hist)
            else:
                st.info("No hay leads en esta sección.")
        else:
            st.info("No hay datos cargados (Posiblemente la pestaña original de Google Sheets esté en blanco a excepción de los encabezados).")

    # --- PESTAÑA DE SEGUIMIENTO ---
    elif st.session_state['current_tab'] == "Seguimiento":
        st.header("Bandeja de Seguimiento (Drip Campaign)")
        st.write("Aquí aparecen los leads a los que les toca recibir el siguiente mensaje de seguimiento.")
        
        # Selector de Origen de Datos
        origen_seguimiento = st.radio("Elige la base de datos:", ["Solo Registro", "Estudios de Perfil"], horizontal=True, key="radio_origen_seg")
        
        # Calendario para buscar pendientes de este día o días anteriores
        selected_date = st.date_input("Ver pendientes para la fecha:", value=datetime.now())
        target_eval_date = pd.to_datetime(selected_date).normalize()
        
        dfs_to_concat = []
        
        if origen_seguimiento == "Solo Registro":
            source_dict = registros
            target_sheet_id = SHEET_REGISTRO
            target_col_contactado = 'F'
            drip_days_ref = DRIP_DAYS_REGISTRO
            mode_card = "seguimiento"
        else: # Estudios de Perfil
            source_dict = estudios
            target_sheet_id = SHEET_ESTUDIO
            target_col_contactado = 'K'
            drip_days_ref = DRIP_DAYS_PERFIL
            mode_card = "seguimiento_perfil"
        
        # Juntar todos los registros del source (que tienen SÍ en contactado)
        for tab, df_tab in source_dict.items():
            if df_tab is not None and not df_tab.empty:
                df_temp = df_tab.copy()
                df_temp['Destino'] = tab  # Destino o Perfil dependiendo del diccionario
                df_temp['TAB_ORIGINAL'] = tab
                dfs_to_concat.append(df_temp)
                
        if dfs_to_concat:
            df_goteo = pd.concat(dfs_to_concat, ignore_index=True)
            df_goteo = df_goteo[df_goteo['CONTACTADO'] == 'SÍ'] # Solo los que ya se contactaron la primera vez
            
            if not df_goteo.empty:
                df_diana, df_augusto = assign_leads(df_goteo, diana_phones)
                df_view = df_diana if asesor == "Diana" else df_augusto
                
                # Filtrar y preparar la lista de leads due (vencidos o del día)
                leads_due = []
                for idx, lead in df_view.iterrows():
                    ultimo_msg = lead.get('ULTIMO_MENSAJE', -1)
                    if pd.isna(ultimo_msg): ultimo_msg = -1
                    else: ultimo_msg = int(ultimo_msg)
                    
                    if ultimo_msg >= 0 and ultimo_msg < len(drip_days_ref) - 1:
                        next_step = ultimo_msg + 1
                        
                        # Si fecha no existe por error, saltarlo temporalmente.
                        fecha_str = str(lead.get('FECHA_ULTIMO_MENSAJE', '')).strip()
                        if not fecha_str or fecha_str == "nan":
                            continue
                            
                        try:
                            fecha_ultimo = pd.to_datetime(fecha_str).normalize()
                            days_to_add = drip_days_ref[next_step] - drip_days_ref[ultimo_msg]
                            
                            # Calcular fecha teórica bruta
                            fecha_teorica = fecha_ultimo + timedelta(days=days_to_add)
                            
                            # Ajustar si cae fin de semana (al Lunes)
                            fecha_real = get_next_business_day(fecha_teorica)
                            
                            # Si la fecha que le toca es menor o igual al día que el asesor está mirando (ej. hoy)
                            if fecha_real <= target_eval_date:
                                leads_due.append((idx, lead, next_step))
                        except Exception as e:
                            pass # Si la fecha está corrupta en la celda
                
                st.write(f"**Mensajes a enviar ({asesor}): {len(leads_due)}**")
                
                if leads_due:
                    for (idx, lead, next_step) in leads_due:
                        tab_to_update = lead.get('TAB_ORIGINAL', 'Desconocido')
                        show_lead_card(idx, lead, tab_to_update, target_sheet_id, target_col_contactado, sheets_service, mode=mode_card, drip_step=next_step, asesor_name=asesor)
                else:
                    st.success("¡Al día! No hay mensajes pendientes programados para esta fecha.")
            else:
                st.info("No tienes leads registrados y contactados para hacer seguimiento en esta sección.")
        else:
            st.info("No hay datos cargados en Google Sheets.")

if __name__ == '__main__':
    main()
