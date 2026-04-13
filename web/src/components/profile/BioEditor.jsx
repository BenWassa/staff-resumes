import { useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CheckCircle2, Loader2 } from "lucide-react";
import { db } from "../../firebase";

const TITLE_OPTIONS = [
  "Partner",
  "Senior Engagement Manager",
  "Senior Consultant",
  "Associate Consultant",
];

export default function BioEditor({ staffId }) {
  const [fields, setFields] = useState({
    first_name: "",
    last_name: "",
    title: "",
    summary: "",
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");
  const summaryRef = useRef(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "staff", staffId));
      if (snap.exists()) {
        const d = snap.data();
        setFields({
          first_name: d.first_name ?? "",
          last_name: d.last_name ?? "",
          title: d.title ?? "",
          summary: d.summary ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, [staffId]);

  // Auto-grow textarea
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.style.height = "auto";
      summaryRef.current.style.height = summaryRef.current.scrollHeight + "px";
    }
  }, [fields.summary]);

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveState("saving");
    setErrorMsg("");
    try {
      await setDoc(
        doc(db, "staff", staffId),
        {
          ...fields,
          display_name: `${fields.first_name} ${fields.last_name}`.trim(),
          updated_at: new Date(),
        },
        { merge: true }
      );
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("error");
      setErrorMsg("Save failed. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-8">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  const isCustomTitle = fields.title && !TITLE_OPTIONS.includes(fields.title);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name">
          <input
            type="text"
            required
            value={fields.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Last name">
          <input
            type="text"
            required
            value={fields.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Title */}
      <Field label="Title">
        <select
          value={TITLE_OPTIONS.includes(fields.title) ? fields.title : "__custom__"}
          onChange={(e) => {
            if (e.target.value !== "__custom__") set("title", e.target.value);
          }}
          className={inputCls}
        >
          {TITLE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
          <option value="__custom__">Other…</option>
        </select>
        {(isCustomTitle || fields.title === "") && (
          <input
            type="text"
            placeholder="Enter custom title"
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            className={`${inputCls} mt-2`}
          />
        )}
      </Field>

      {/* Bio / Summary */}
      <Field label="Bio / Summary" hint="This text appears verbatim in the resume template.">
        <textarea
          ref={summaryRef}
          value={fields.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={4}
          className={`${inputCls} resize-none overflow-hidden`}
          placeholder="Write a 2–3 sentence professional summary…"
        />
      </Field>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saveState === "saving"}
          className="bg-[var(--blc-red)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-[var(--radius)] transition-opacity"
        >
          {saveState === "saving" ? "Saving…" : "Save bio"}
        </button>

        {saveState === "saved" && (
          <span className="flex items-center gap-1.5 text-sm text-green-500">
            <CheckCircle2 size={15} /> Saved
          </span>
        )}
        {saveState === "error" && (
          <span className="text-sm text-red-400">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </label>
      {hint && <p className="text-xs text-[var(--text-muted)] mb-1">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--blc-red)] transition-colors";
