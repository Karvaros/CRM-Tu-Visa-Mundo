import assert from "node:assert/strict";
import test from "node:test";
import { whatsappUrl } from "../lib/whatsapp";

test("Android apunta a Business con número y texto completos y no al WhatsApp personal", () => {
  const text = "¡Hola! Soy Lina Osorio.\nCanadá & Australia; #Intent; 😊";
  const url = whatsappUrl("+57 (313) 123-4567", text, "Mozilla/5.0 (Linux; Android 14) Chrome/130");
  assert.ok(url.startsWith("intent://send?phone=573131234567&text="));
  assert.ok(url.includes(";package=com.whatsapp.w4b;"));
  const query = url.slice("intent://send?".length, url.indexOf("#Intent;"));
  assert.equal(new URLSearchParams(query).get("text"), text);
  const fallback = url.match(/S.browser_fallback_url=([^;]+)/)![1];
  assert.equal(decodeURIComponent(fallback), "https://play.google.com/store/apps/details?id=com.whatsapp.w4b");
});

test("en computador conserva el enlace web y abrir nunca registra un envío", () => {
  assert.equal(whatsappUrl("+57 313 123 4567", "Hola Lina", "Windows NT"),
    "https://wa.me/573131234567?text=Hola%20Lina");
  assert.equal(whatsappUrl("+57 313 123 4567"), "https://wa.me/573131234567");
});
