/**
 * SEE artifacts/worker-index-v4.js for the full update (map + bots + CN cities).
 * This temporary stub prevents a broken repo; replace with worker-index-v4.js content.
 *
 * Binding: KV VISITORS
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/cities") {
      let list = [];
      try {
        const raw = await env.VISITORS.get("cities", { type: "json" });
        if (Array.isArray(raw)) list = raw;
      } catch {}
      return new Response(JSON.stringify({ cities: list, warning: "Deploy worker-index-v4.js from release artifacts" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    return new Response(
      "Deploy the full Worker: copy contents of worker-index-v4.js into this Worker and Save & Deploy. See repo CHANGELOG.md.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  },
};
