import type { StudyAutomations, StudyFields } from "./activecampaign";
import type { BaserowTables } from "./baserow";
import type { StudyTableIds } from "./study-store";

function id(name: string): number {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Falta configurar ${name}.`);
  return value;
}

export function baserowTables(): BaserowTables {
  return {
    leads: id("BASEROW_LEADS_TABLE_ID"),
    interacciones: id("BASEROW_INTERACTIONS_TABLE_ID"),
    mensajes: id("BASEROW_MESSAGES_TABLE_ID"),
  };
}

export function studyTableIds(): StudyTableIds {
  const tables = baserowTables();
  return {
    leads: tables.leads,
    interacciones: tables.interacciones,
    emailField: id("BASEROW_EMAIL_FIELD_ID"),
    eventField: id("BASEROW_EVENT_FIELD_ID"),
  };
}

export function studyAutomations(): StudyAutomations {
  return {
    PERFIL_ALTO_RENOVACION: id("AC_AUTO_HIGH_RENEWAL_ID"),
    PERFIL_ALTO_PRIMERA_VEZ: id("AC_AUTO_HIGH_FIRST_ID"),
    PERFIL_MEDIO_ALTO: id("AC_AUTO_MEDIUM_HIGH_ID"),
    PERFIL_MEDIO: id("AC_AUTO_MEDIUM_ID"),
    PERFIL_BAJO: id("AC_AUTO_LOW_ID"),
  };
}

export function studyFields(): StudyFields {
  return {
    destino: id("AC_FIELD_DESTINATION_ID"),
    grupo: id("AC_FIELD_GROUP_ID"),
    solicitud: id("AC_FIELD_APPLICATION_ID"),
    pasaportes: id("AC_FIELD_PASSPORTS_ID"),
    ocupacion: id("AC_FIELD_OCCUPATION_ID"),
    visaAnterior: id("AC_FIELD_PREVIOUS_VISA_ID"),
    viajes: id("AC_FIELD_TRAVEL_ID"),
    cumplimiento: id("AC_FIELD_COMPLIANCE_ID"),
    lazos: id("AC_FIELD_TIES_ID"),
  };
}
