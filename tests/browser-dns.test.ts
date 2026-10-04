import assert from "node:assert/strict";
import dns from "node:dns/promises";
import test from "node:test";
import { validatePublicUrl } from "../apps/worker/src/network.ts";

const dnsError = (code: string) => Object.assign(new Error("DNS query failed"), { code });

test("browser DNS queries both address families without OS/VPN name lookup", async (t) => {
  const ipv4 = t.mock.method(dns, "resolve4", async () => ["93.184.216.34"]);
  const ipv6 = t.mock.method(dns, "resolve6", async () => ["2606:4700::1111"]);
  const lookup = t.mock.method(dns, "lookup", () => {
    throw new Error("OS name lookup must not be used");
  });
  const target = await validatePublicUrl("https://example.com/path");
  assert.equal(target.address, "93.184.216.34");
  assert.equal(target.family, 4);
  assert.deepEqual(ipv4.mock.calls[0]?.arguments, ["example.com"]);
  assert.deepEqual(ipv6.mock.calls[0]?.arguments, ["example.com"]);
  assert.equal(lookup.mock.callCount(), 0);
});

test("browser DNS accepts a public address when the other family has no records", async (t) => {
  t.mock.method(dns, "resolve4", async () => ["93.184.216.34"]);
  t.mock.method(dns, "resolve6", async () => {
    throw dnsError("ENODATA");
  });
  assert.equal((await validatePublicUrl("https://example.com")).family, 4);
  t.mock.method(dns, "resolve4", async () => {
    throw dnsError("ENOTFOUND");
  });
  t.mock.method(dns, "resolve6", async () => ["2606:4700::1111"]);
  assert.equal((await validatePublicUrl("https://example.com")).family, 6);
});

test("browser DNS still rejects private IPv6 alongside public IPv4", async (t) => {
  t.mock.method(dns, "resolve4", async () => ["93.184.216.34"]);
  t.mock.method(dns, "resolve6", async () => ["::1"]);
  await assert.rejects(validatePublicUrl("https://example.com"), { code: "BLOCKED_URL" });
});

test("browser DNS still rejects private and fake IPv4 alongside public IPv6", async (t) => {
  t.mock.method(dns, "resolve6", async () => ["2606:4700::1111"]);
  const ipv4 = t.mock.method(dns, "resolve4", async () => ["127.0.0.1"]);
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "198.18.0.225"]) {
    ipv4.mock.mockImplementation(async () => [address]);
    await assert.rejects(validatePublicUrl("https://example.com"), { code: "BLOCKED_URL" });
  }
});

test("browser DNS does not hide a failed family query behind a successful answer", async (t) => {
  t.mock.method(dns, "resolve4", async () => ["93.184.216.34"]);
  t.mock.method(dns, "resolve6", async () => {
    throw dnsError("ETIMEOUT");
  });
  await assert.rejects(validatePublicUrl("https://example.com"), { code: "DNS_UNAVAILABLE" });
});

test("browser DNS rejects hostnames without any addresses", async (t) => {
  for (const method of ["resolve4", "resolve6"] as const)
    t.mock.method(dns, method, async () => {
      throw dnsError("ENODATA");
    });
  await assert.rejects(validatePublicUrl("https://example.com"), { code: "BLOCKED_URL" });
});
