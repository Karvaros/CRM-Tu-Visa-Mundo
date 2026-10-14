import { classifyStudy } from "./study-scoring";
import { confirmedWhatsAppMessageIds, firstStudyMessage, studySequenceForDestination } from "./message-sequences";
import type { createStudyStore } from "./study-store";
import type { createActiveCampaign } from "./activecampaign";
import type { CrmData } from "./types";
import { hasConfirmedContact, stateAfterStudy } from "./commercial-status";

/** Resolves only the approved, previously unclassified visa/no-travel combination. */
export function createStudyReview(options: {
  store: ReturnType<typeof createStudyStore>;
  campaign: ReturnType<typeof createActiveCampaign>;
  load(): Promise<CrmData>;
  now?: () => Date;
}) {
  const { store, campaign, load, now = () => new Date() } = options;
  return async (leadId: string, version: number, asesor: string) => {
    const data = await load();
    const lead = data.leads.find((item) => item.id === leadId);
    if (!lead?.email || lead.version !== version) throw new Error("El lead cambió. Recarga antes de revisar.");
    let claim = await store.findClaim(lead.email);
    const rawLead = await store.findLead(lead.email);
    if (!claim || !rawLead || String(rawLead.id) !== leadId || Number(rawLead.VERSION || 0) !== version
      || claim.id !== lead.primerEstudioId) throw new Error("No se encontró el primer estudio o el lead cambió.");
    if (["CLIENTE", "NO_APTO", "INACTIVO"].includes(lead.estado) || rawLead.AC_SYNC_STATUS === "OPTED_OUT")
      throw new Error("No se puede reactivar un lead cerrado ni sus correos comerciales.");
    const originalPending = claim.perfil === "PENDIENTE" && claim.status === "REVIEW";
    const retry = claim.perfil === "C" && Boolean(claim.revision) && ["ERROR", "PROCESSING"].includes(claim.status);
    if (!originalPending && !retry) throw new Error("Este estudio ya está clasificado o no admite esta revisión.");
    const answers = claim.answers;
    if (answers.solicitud !== "Primera vez" || answers.viajes !== "No: No ha salido del país"
      || answers.visaAnterior !== "Sí, de EEUU o Canadá o Australia") throw new Error("Este cruce requiere otra revisión.");
    const outcome = classifyStudy(answers);
    if (outcome.perfil !== "C") throw new Error("La revisión no corresponde a Perfil Medio.");
    if (originalPending && (!["ESTUDIO_GRATUITO", "NUEVO", "CONTACTADO"].includes(lead.estado) || !lead.seguimientoManual
      || lead.proximaAccion !== "Revisar clasificación del Estudio de Perfil"))
      throw new Error("El asesor ya cambió el seguimiento; revisa la ficha.");
    if (retry && claim.status === "PROCESSING" && claim.revision &&
      now().getTime() - Date.parse(claim.revision.fecha) < 120_000) throw new Error("La revisión está en proceso. Espera un momento.");
    const automation = campaign.automationForOutcome(outcome);
    if (!automation) throw new Error("Falta la automatización de Perfil Medio.");
    const contact = await campaign.findContact(claim.email);
    const historical = contact ? await campaign.historicalStudy(contact.id) : null;
    if (historical && historical.automation !== automation) throw new Error("ActiveCampaign tiene otro resultado; requiere revisión manual.");
    const next = firstStudyMessage(data.mensajes, answers.destino!, "C", confirmedWhatsAppMessageIds(data, lead));
    if (!next || next.requiereRevision) throw new Error("No hay una plantilla establecida para continuar.");
    claim = { ...claim, perfil: "C", automation, status: "PROCESSING", revision: claim.revision ?? {
      motivo: outcome.motivo, asesor, fecha: now().toISOString(),
    } };
    await store.updateClaim(claim);
    try {
      await store.recordRevision(claim, rawLead.id);
      const synced = historical ? contact! : await campaign.syncContact(answers);
      if (!historical) await campaign.startStudyAutomation(synced.id, automation);
      // Re-read before restoring the queue; do not overwrite an advisor's concurrent decision.
      const latest = await store.findLead(claim.email);
      if (!latest || Number(latest.VERSION || 0) !== version) throw new Error("El lead cambió durante la revisión. Recarga antes de continuar.");
      const restoreQueue = originalPending || (["ESTUDIO_GRATUITO", "NUEVO", "CONTACTADO"].includes(String(latest.ESTADO))
        && latest.PROXIMA_ACCION === "Revisar clasificación del Estudio de Perfil");
      await store.updateLead(rawLead.id, {
        PERFIL_ESTUDIO: "C", SEGMENTO: "ESTUDIO_C", AC_CONTACT_ID: synced.id, AC_SYNC_STATUS: "SENT",
        VERSION: version + 1,
        ESTADO: stateAfterStudy(lead.estado, hasConfirmedContact(data, lead)),
        ...(restoreQueue ? { SECUENCIA_ID: studySequenceForDestination(answers.destino!),
          PROXIMO_MENSAJE: [Number(next.id)], PROXIMO_CONTACTO: now().toISOString(),
          PROXIMA_ACCION: next.titulo, SECUENCIA_PAUSADA: false, SEGUIMIENTO_MANUAL: false } : {}),
      });
      await store.updateClaim({ ...claim, status: "SENT", acContactId: synced.id });
      return { perfil: "C", status: "SENT", data: await load() };
    } catch (error) {
      await store.updateClaim({ ...claim, status: "ERROR" });
      throw error;
    }
  };
}
