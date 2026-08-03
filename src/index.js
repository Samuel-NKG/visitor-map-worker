/**
 * SEE_FULL_FILE_IN_ARTIFACTS
 * User: copy from Cloudflare your working Worker to GitHub src/index.js
 * Temporary stub to unbreak repo until full file is pushed.
 */
export default {
  async fetch() {
    return new Response(
      JSON.stringify({
        error: "src/index.js needs restore",
        hint: "Copy your working Cloudflare Worker code into src/index.js",
        fields_doc: "https://github.com/Samuel-NKG/visitor-map-worker/blob/main/FIELDS.md",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  },
};
