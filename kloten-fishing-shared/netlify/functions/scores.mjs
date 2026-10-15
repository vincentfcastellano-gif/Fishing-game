import { getStore } from "@netlify/blobs";

// Shared leaderboard for the Kloten fishing game.
// Every catch and every lost fish is stored as its own small blob, so two
// friends posting at the same moment never overwrite each other.

const SPECIES = {
  perch: { min: 0.1, max: 1.5, mult: 2, cm: [14, 38] },
  trout: { min: 0.3, max: 4, mult: 1.5, cm: [25, 65] },
  pike: { min: 0.8, max: 12, mult: 1, cm: [45, 115] }
};
const SPOTS = ["malings", "korslangen"];
const CLASSES = ["Small", "Decent", "Big", "Monster"];
const ID_RE = /^\d{13}-[a-z0-9]{6}$/;
const MAX_EVENTS = 600;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });

const cleanName = (s) =>
  String(s ?? "").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 14);

export default async (req) => {
  try {
    const store = getStore("kloten-fishing");

    if (req.method === "GET") {
      const { blobs } = await store.list({ prefix: "e/" });
      const keys = blobs.map((b) => b.key).sort().slice(-MAX_EVENTS);
      const events = (
        await Promise.all(keys.map((k) => store.get(k, { type: "json" }).catch(() => null)))
      ).filter(Boolean);
      const catches = [];
      const lost = {};
      for (const e of events) {
        if (e.t === "c") catches.push(e);
        else if (e.t === "l") lost[e.p] = (lost[e.p] || 0) + 1;
      }
      return json({ catches, lost });
    }

    if (req.method === "POST") {
      const text = await req.text();
      if (text.length > 2000) return json({ error: "too large" }, 400);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: "bad json" }, 400); }
      if (!body || typeof body !== "object") return json({ error: "bad body" }, 400);

      // Organizer reset (needs RESET_PIN set in the Netlify site settings)
      if (body.action === "reset") {
        const pin = process.env.RESET_PIN;
        if (!pin) return json({ error: "Reset is disabled. Set RESET_PIN in Netlify first." }, 403);
        if (body.pin !== pin) return json({ error: "Wrong PIN." }, 403);
        const { blobs } = await store.list({ prefix: "e/" });
        await Promise.all(blobs.map((b) => store.delete(b.key)));
        return json({ ok: true });
      }

      const p = cleanName(body.p);
      if (!p) return json({ error: "name required" }, 400);
      if (typeof body.id !== "string" || !ID_RE.test(body.id)) return json({ error: "bad id" }, 400);
      const key = "e/" + body.id;

      // Retries are safe: the same id is only stored once.
      if (await store.get(key)) return json({ ok: true, dup: true });

      if (body.t === "l") {
        await store.setJSON(key, { t: "l", id: body.id, p, at: Date.now() });
        return json({ ok: true });
      }

      if (body.t === "c") {
        const sp = SPECIES[body.sp];
        if (!sp) return json({ error: "bad species" }, 400);
        const kg = Number(body.kg);
        if (!Number.isFinite(kg) || kg < sp.min - 0.01 || kg > sp.max + 0.01) return json({ error: "bad weight" }, 400);
        const cm = Math.round(Number(body.cm));
        if (!(cm >= sp.cm[0] - 1 && cm <= sp.cm[1] + 1)) return json({ error: "bad length" }, 400);
        if (!CLASSES.includes(body.cls)) return json({ error: "bad class" }, 400);
        if (!SPOTS.includes(body.spot)) return json({ error: "bad spot" }, 400);
        const kgR = Math.round(kg * 100) / 100;
        const pts = Math.round(kgR * sp.mult * 10) + (body.cls === "Big" ? 10 : body.cls === "Monster" ? 40 : 0);
        await store.setJSON(key, {
          t: "c", id: body.id, p, sp: body.sp, kg: kgR, cm, cls: body.cls, pts, spot: body.spot, at: Date.now()
        });
        return json({ ok: true });
      }

      return json({ error: "unknown type" }, 400);
    }

    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "server error" }, 500);
  }
};

export const config = { path: "/api/scores" };
