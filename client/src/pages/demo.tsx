import { useEffect } from "react";

const FORM_URL = "https://api.leadconnectorhq.com/widget/form/XfERvpDpbuFJ5KWk6iDZ";

export default function Demo() {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://link.msgsndr.com/js/form_embed.js"]',
    );
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://link.msgsndr.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Book a Demo</h1>
        <p className="text-white/60 mb-8">
          Tell us about your club and we'll set up a live walkthrough.
        </p>
        <div className="rounded-2xl overflow-hidden bg-white">
          <iframe
            src={FORM_URL}
            id="inline-XfERvpDpbuFJ5KWk6iDZ"
            data-layout='{"id":"INLINE"}'
            data-trigger-type="alwaysShow"
            data-activation-type="alwaysActivated"
            data-deactivation-type="neverDeactivate"
            data-form-name="Book a Demo"
            data-layout-iframe-id="inline-XfERvpDpbuFJ5KWk6iDZ"
            data-form-id="XfERvpDpbuFJ5KWk6iDZ"
            title="Book a Demo"
            style={{ width: "100%", height: "min(85vh, 900px)", border: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
