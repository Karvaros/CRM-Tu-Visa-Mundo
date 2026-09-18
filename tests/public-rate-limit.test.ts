import assert from "node:assert/strict";
import test from "node:test";
import { publicRateLimitKey } from "../lib/public-rate-limit";

test("separa el límite del estudio del límite de acceso con la misma IP", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "203.0.113.7",
    "x-forwarded-for": "198.51.100.20",
  });
  assert.equal(publicRateLimitKey("study", headers), "study:203.0.113.7");
  assert.equal(publicRateLimitKey("login", headers), "login:203.0.113.7");
  assert.equal(publicRateLimitKey("login", new Headers()), null);
});
