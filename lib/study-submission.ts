import { studyOptions, type StudyAnswers } from "./study";
import { classifyStudy } from "./study-scoring";
import type { StudyClaim, StoredProfile, createStudyStore } from "./study-store";
import type { createActiveCampaign } from "./activecampaign";
import type { Message } from "./types";

type Store = ReturnType<typeof createStudyStore>;
type Campaign = ReturnType<typeof createActiveCampaign>;
export type SubmissionResult = { perfil: StoredProfile | null; status: "SENT" | "EXISTING" | "REVIEW" | "PROCESSING" | "ERROR" | "CLOSED" };

export function validateStudyAnswers(input: unknown): StudyAnswers {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Respuestas inválidas.");
  const record = input as Record<string, unknown>;
  const answers: StudyAnswers = {};
  for (const [key, choices] of Object.entries(studyOptions)) {
    if (typeof record[key] !== "string" || !(choices as readonly string[]).includes(record[key])) {
      throw new Error(`Selecciona una respuesta válida en ${key}.`);
    }
    answers[key as keyof typeof studyOptions] = record[key] as string;
  }
  if ([record.nombre, record.email, record.telefono].some((value) => typeof value !== "string")) {
    throw new Error("Completa tus datos de contacto.");
  }
  const nombre = (record.nombre as string).trim();
  const email = (record.email as string).trim().toLowerCase();
  const telefono = (record.telefono as string).trim();
  if (nombre.length < 3 || nombre.length > 120) throw new Error("Indica tu nombre completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Indica un correo válido.");
  if (!/^\+?[0-9()\s.-]{8,25}$/.test(telefono)) throw new Error("Indica un teléfono válido con código de país.");
  return { ...answers, nombre, email, telefono };
}

function leadFields(claim: StudyClaim) {
  const isLow = claim.perfil === "D";
  const isPending = claim.perfil === "PENDIENTE";
  return {
    DESTINO: claim.answers.destino,
    TIPO_VISA: "Turismo",
    TIPO_ESTUDIO: "GRATUITO",
    ...(isPending ? {} : { PERFIL_ESTUDIO: claim.perfil, SEGMENTO: `ESTUDIO_${claim.perfil}` }),
    PRIMER_ESTUDIO_ID: claim.id,
    FECHA_PRIMER_ESTUDIO: claim.createdAt,
    SECUENCIA_PAUSADA: true,
    SECUENCIA_ID: "",
    PROXIMO_MENSAJE: [],
    ESTADO: isLow ? "NO_APTO" : "ESTUDIO_GRATUITO",
    SEGUIMIENTO_MANUAL: !isLow,
    ...(isLow ? {} : { PROXIMO_CONTACTO: claim.createdAt }),
    PROXIMA_ACCION: isLow ? "Sin seguimiento comercial" : isPending
      ? "Revisar clasificación del Estudio de Perfil"
      : "Revisar estudio y continuar desde el último WhatsApp enviado",
    AC_SYNC_STATUS: claim.status,
    ...(claim.acContactId ? { AC_CONTACT_ID: claim.acContactId } : {}),
  };
}

export function createStudySubmission(options: {
  store: Store; campaign: Campaign; now?: () => Date; uuid?: () => string;
  selectWhatsApp?: (destination: string, profile: StoredProfile) => Promise<Message | undefined>;
}) {
  const { store, campaign, now = () => new Date(), uuid = () => crypto.randomUUID(), selectWhatsApp } = options;

  return async function submit(raw: unknown): Promise<SubmissionResult> {
    const answers = validateStudyAnswers(raw);
    const email = answers.email!;
    const [currentLead, firstClaim] = await Promise.all([store.findLead(email), store.findClaim(email)]);
    const manuallyClosed = Boolean(currentLead && (currentLead.AC_SYNC_STATUS === "OPTED_OUT"
      || currentLead.ESTADO === "INACTIVO"
      || (currentLead.ESTADO === "NO_APTO" && !currentLead.PRIMER_ESTUDIO_ID && !firstClaim)));
    let claim = firstClaim;
    const recovering = Boolean(claim);
    if (!claim && currentLead?.PRIMER_ESTUDIO_ID) {
      return { perfil: null, status: "EXISTING" };
    }
    if (claim && currentLead?.PRIMER_ESTUDIO_ID === claim.id &&
      ["SENT", "HISTORICAL", "REVIEW", "CLOSED"].includes(claim.status)) {
      return { perfil: null, status: "EXISTING" };
    }
    if (claim?.status === "PROCESSING" && now().getTime() - new Date(claim.createdAt).getTime() < 120_000) {
      return { perfil: null, status: "PROCESSING" };
    }
    if (!claim) {
      const contact = await campaign.findContact(email);
      const historical = contact ? await campaign.historicalStudy(contact.id) : null;
      const outcome = classifyStudy(answers);
      const profile = historical?.perfil ?? outcome.perfil;
      const historicalDate = historical?.date && !Number.isNaN(Date.parse(historical.date))
        ? new Date(historical.date).toISOString() : null;
      const proposed: StudyClaim = {
        id: uuid(), email, answers, perfil: profile,
        automation: historical?.automation ?? campaign.automationForOutcome(outcome),
        createdAt: historicalDate ?? now().toISOString(),
        status: historical ? "HISTORICAL" : manuallyClosed ? "CLOSED" : profile === "PENDIENTE" ? "REVIEW" : "PROCESSING",
        legacy: Boolean(historical),
        acContactId: historical ? contact?.id : undefined,
      };
      const result = await store.claimFirst(proposed);
      claim = result.claim;
      if (!result.created && claim.status === "PROCESSING") return { perfil: null, status: "PROCESSING" };
    }

    const originalLead = currentLead ?? await store.findLead(email);
    if (originalLead?.PRIMER_ESTUDIO_ID && originalLead.PRIMER_ESTUDIO_ID !== claim.id) {
      return { perfil: null, status: "EXISTING" };
    }
    const baseFields: Record<string, unknown> = leadFields(claim);
    const preserveManual = Boolean(originalLead && (["CLIENTE", "NO_APTO", "INACTIVO"].includes(String(originalLead.ESTADO))
      || originalLead.SEGUIMIENTO_MANUAL === true || originalLead.ESTADO === "EN_CONVERSACION"));
    if (!preserveManual && ["A", "B", "C"].includes(claim.perfil) && selectWhatsApp) {
      const next = await selectWhatsApp(claim.answers.destino!, claim.perfil);
      if (next && !next.requiereRevision) {
        baseFields.SECUENCIA_ID = next.secuenciaId;
        baseFields.PROXIMO_MENSAJE = [Number(next.id)];
        baseFields.SECUENCIA_PAUSADA = false;
        baseFields.SEGUIMIENTO_MANUAL = false;
        baseFields.PROXIMA_ACCION = next.titulo;
      }
    }
    if (originalLead) baseFields.VERSION = Number(originalLead.VERSION || 0) + 1;
    if (preserveManual) {
      delete baseFields.ESTADO;
      delete baseFields.PROXIMA_ACCION;
      delete baseFields.SEGUIMIENTO_MANUAL;
      delete baseFields.PROXIMO_CONTACTO;
      baseFields.SECUENCIA_PAUSADA = true;
    }
    if (manuallyClosed) delete baseFields.AC_SYNC_STATUS;
    const lead = originalLead
      ? await store.updateLead(originalLead.id, baseFields)
      : await store.createLead({
        NOMBRE: claim.answers.nombre, EMAIL: email, WHATSAPP: claim.answers.telefono,
        ORIGEN: "ESTUDIO_V2", FECHA_INGRESO: claim.createdAt, VERSION: 1,
        ...baseFields,
      });
    await store.linkClaim(claim, lead.id);

    if (manuallyClosed) {
      // A later study may be recorded, but must never restart email for a lead closed by an advisor.
      if (claim.status !== "CLOSED") {
        claim = { ...claim, status: "CLOSED" };
        await store.updateClaim(claim);
      }
      return { perfil: null, status: "CLOSED" };
    }
    if (claim.status === "SENT") return { perfil: null, status: "EXISTING" };
    if (claim.status === "HISTORICAL") return { perfil: null, status: "EXISTING" };
    if (claim.status === "REVIEW") return { perfil: claim.perfil, status: "REVIEW" };
    if (!claim.automation) return { perfil: claim.perfil, status: "REVIEW" };
    if (recovering) {
      // A prior API call may have started the email before its response or our status write failed.
      const contact = await campaign.findContact(email);
      const run = contact ? await campaign.historicalStudy(contact.id) : null;
      if (run) {
        const sent = run.automation === claim.automation;
        claim = { ...claim, acContactId: contact!.id, status: sent ? "SENT" : "REVIEW" };
        await store.updateClaim(claim);
        await store.updateLead(lead.id, {
          AC_CONTACT_ID: contact!.id, AC_SYNC_STATUS: claim.status,
          ...(!sent ? { PROXIMA_ACCION: "Revisar conflicto con un estudio anterior en ActiveCampaign" } : {}),
        });
        return { perfil: null, status: sent ? "EXISTING" : "REVIEW" };
      }
    }
    let contactId: string;
    try {
      const contact = await campaign.syncContact(claim.answers);
      contactId = contact.id;
      await campaign.startStudyAutomation(contact.id, claim.automation);
    } catch {
      claim = { ...claim, status: "ERROR" };
      await store.updateClaim(claim);
      await store.updateLead(lead.id, { AC_SYNC_STATUS: "ERROR", PROXIMA_ACCION: "Revisar envío de resultado por correo" });
      return { perfil: null, status: "ERROR" };
    }
    claim = { ...claim, status: "SENT" };
    await Promise.all([
      store.updateClaim(claim),
      store.updateLead(lead.id, { AC_CONTACT_ID: contactId, AC_SYNC_STATUS: "SENT" }),
    ]);
    return { perfil: claim.perfil, status: "SENT" };
  };
}
