/** Android explicitly targets Business; desktop retains the usual web entry. */
export function whatsappUrl(phone: string, text = "", userAgent = ""): string {
  const digits = phone.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  if (!/Android/i.test(userAgent)) return `https://wa.me/${digits}${query}`;
  const params = `phone=${digits}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  const fallback = encodeURIComponent("https://play.google.com/store/apps/details?id=com.whatsapp.w4b");
  return `intent://send?${params}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${fallback};end`;
}
