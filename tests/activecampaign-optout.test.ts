import assert from "node:assert/strict";
import test from "node:test";
import { createActiveCampaignOptOut } from "../lib/activecampaign-optout";

test("detiene todos los correos comerciales del contacto y no toca otros contactos", async () => {
  const memberships = new Map([["3", 1], ["4", 1], ["5", 2]]);
  const runs = new Set(Array.from({ length: 101 }, (_, index) => String(index + 10)));
  const removed: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    assert.equal(new Headers(init?.headers).get("Api-Token"), "secret");
    if (url.pathname.endsWith("/contacts")) {
      return Response.json({ contacts: [
        { id: "8", email: "another@example.com" },
        { id: "7", email: "test@example.com" },
      ] });
    }
    if (url.pathname.endsWith("/contacts/7/contactLists")) {
      return Response.json({ contactLists: [...memberships].map(([list, status]) => ({ contact: "7", list, status })) });
    }
    if (url.pathname.endsWith("/contactLists") && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { contactList: { contact: string; list: string; status: number } };
      assert.equal(body.contactList.contact, "7");
      assert.equal(body.contactList.status, 2);
      memberships.set(body.contactList.list, 2);
      return Response.json({ contactList: body.contactList });
    }
    if (url.pathname.endsWith("/contactAutomations") && method === "GET") {
      assert.equal(url.searchParams.get("filters[subscriberid][eq]"), "7");
      assert.equal(url.searchParams.get("filters[status][eq]"), "1");
      const offset = Number(url.searchParams.get("offset"));
      return Response.json({ contactAutomations: [...runs].slice(offset, offset + 100)
        .map((id) => ({ id, contact: "7", status: "1" })) });
    }
    if (url.pathname.includes("/contactAutomations/") && method === "DELETE") {
      const id = url.pathname.split("/").at(-1)!;
      assert.equal(runs.delete(id), true);
      removed.push(id);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };
  await createActiveCampaignOptOut({ apiUrl: "https://example.api-us1.com", apiKey: "secret", fetcher })
    .stopMarketing("TEST@example.com");
  assert.deepEqual([...memberships], [["3", 2], ["4", 2], ["5", 2]]);
  assert.equal(removed.length, 101);
  assert.equal(runs.size, 0);
});

test("no modifica ActiveCampaign si no hay contacto exacto", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return Response.json({ contacts: [{ id: "9", email: "different@example.com" }] });
  };
  await createActiveCampaignOptOut({ apiUrl: "https://example.api-us1.com", apiKey: "secret", fetcher })
    .stopMarketing("test@example.com");
  assert.equal(calls, 1);
});

test("rechaza una respuesta de ActiveCampaign que podría afectar a otro contacto", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/contacts")) return Response.json({ contacts: [{ id: "7", email: "test@example.com" }] });
    if (url.pathname.endsWith("/contacts/7/contactLists")) return Response.json({ contactLists: [] });
    return Response.json({ contactAutomations: [{ id: "13", contact: "8", status: "1" }] });
  };
  await assert.rejects(() => createActiveCampaignOptOut({
    apiUrl: "https://example.api-us1.com", apiKey: "secret", fetcher,
  }).stopMarketing("test@example.com"), /automatización inesperada/);
});
