type Fetcher = typeof fetch;
type Contact = { id: string; email: string };
type ContactList = { contact: string; list: string; status: string | number };
type ContactAutomation = { id: string; contact: string; status: string | number };

function validId(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

/** Stops queued automation emails and removes every active marketing-list subscription. */
export function createActiveCampaignOptOut(options: {
  apiUrl: string; apiKey: string; fetcher?: Fetcher;
}) {
  const { apiUrl, apiKey, fetcher = fetch } = options;
  const origin = new URL(apiUrl);
  if (origin.protocol !== "https:") throw new Error("ActiveCampaign requiere HTTPS.");
  if (!apiKey) throw new Error("Falta ACTIVE_CAMPAIGN_API_KEY.");
  const base = `${origin.origin}/api/3`;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`${base}${path}`, {
      ...init,
      headers: { "Api-Token": apiKey, "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`ActiveCampaign devolvió HTTP ${response.status}.`);
    const body = await response.text();
    return body ? JSON.parse(body) as T : undefined as T;
  }

  async function contactFor(email: string): Promise<Contact | null> {
    const normalized = email.trim().toLowerCase();
    const result = await request<{ contacts: Contact[] }>(`/contacts?email=${encodeURIComponent(normalized)}&limit=2`);
    if (!Array.isArray(result.contacts)) throw new Error("Búsqueda de contactos inválida.");
    const contact = result.contacts.find((item) => item.email?.toLowerCase() === normalized) ?? null;
    if (contact && !validId(String(contact.id))) throw new Error("Identificador de contacto inválido.");
    return contact;
  }

  async function activeRuns(contactId: string): Promise<ContactAutomation[]> {
    const runs: ContactAutomation[] = [];
    for (let offset = 0; ; offset += 100) {
      const result = await request<{ contactAutomations: ContactAutomation[] }>(
        `/contactAutomations?filters[subscriberid][eq]=${contactId}&filters[status][eq]=1&limit=100&offset=${offset}`,
      );
      if (!Array.isArray(result.contactAutomations)) throw new Error("Automatizaciones inválidas.");
      for (const run of result.contactAutomations) {
        if (String(run.contact) !== contactId || Number(run.status) !== 1 || !validId(String(run.id))) {
          throw new Error("ActiveCampaign devolvió una automatización inesperada.");
        }
      }
      runs.push(...result.contactAutomations);
      if (result.contactAutomations.length < 100) break;
    }
    return runs;
  }

  async function activeLists(contactId: string): Promise<string[]> {
    const result = await request<{ contactLists: ContactList[] }>(`/contacts/${contactId}/contactLists`);
    if (!Array.isArray(result.contactLists)) throw new Error("Listas de ActiveCampaign inválidas.");
    const ids = new Set<string>();
    for (const membership of result.contactLists) {
      if (String(membership.contact) !== contactId || !validId(String(membership.list))) {
        throw new Error("ActiveCampaign devolvió una lista inesperada.");
      }
      if (Number(membership.status) === 1) ids.add(String(membership.list));
    }
    return [...ids];
  }

  return {
    async stopMarketing(email: string): Promise<void> {
      const contact = await contactFor(email);
      if (!contact) return;
      const contactId = String(contact.id);
      // Unsubscribe first, then remove running automations so none can re-subscribe the contact.
      for (const listId of await activeLists(contactId)) {
        await request(`/contactLists`, {
          method: "POST",
          body: JSON.stringify({ contactList: { contact: contactId, list: listId, status: 2 } }),
        });
      }
      // Fetch every page before deleting: deletion changes the result offsets.
      for (const run of await activeRuns(contactId)) {
        await request(`/contactAutomations/${run.id}`, { method: "DELETE" });
      }
      if ((await activeLists(contactId)).length || (await activeRuns(contactId)).length) {
        throw new Error("ActiveCampaign aún tiene envíos comerciales activos para este contacto.");
      }
    },
  };
}
