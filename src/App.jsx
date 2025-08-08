import React, { useMemo, useState } from "react";
import AboutTool from "./AboutTool.jsx";
import AboutMe from "./AboutMe.jsx";

/** MyTriage+ — tabs + L5 fix
 * Decision-support only — clinical judgement required.
 * L5 complaints are NOT auto-capped to L3 for missing vitals,
 * but WILL escalate if abnormal vitals are entered.
 */

const TRIAGE_META = {
  1: { name: "Resuscitation", color: "bg-red-600", tt: "0 min (immediate)" },
  2: { name: "Emergency", color: "bg-orange-500", tt: "<10 min" },
  3: { name: "Urgent", color: "bg-yellow-400", tt: "<30 min" },
  4: { name: "Early Care", color: "bg-green-500", tt: "<60 min" },
  5: { name: "Routine", color: "bg-blue-500", tt: "<90 min" },
};

// === Complaints (trimmed example; keep your full list) ===
const COMPLAINTS = {
  adult: {
    "Shortness of Breath": [
      { key: "stridor_or_ams_or_exhausted", label: "Stridor / AMS / exhausted", level: 2 },
      { key: "wheeze_rr_fast", label: "Wheeze + fast RR; airway intact", level: 3 },
      { key: "mild", label: "Mild, RR near normal", level: 4 },
    ],
    "Chest Pain": [
      { key: "ongoing_or_new_lt6h_high_susp", label: "Ongoing / new <6h, high suspicion", level: 2 },
      { key: "reduced_or_gt6h_intermediate", label: ">6h or reduced; intermediate risk", level: 3 },
      { key: "persisting_mild_low_risk", label: "Persisting mild; low risk", level: 4 },
      { key: "resolved_low_risk", label: "Resolved; low risk; normal ECG", level: 5 },
    ],
    "Abdominal Pain": [
      { key: "bleeding_rigid_or_severe8_10", label: "Bleeding PR/PO, rigid abdomen, severe 8–10", level: 2 },
      { key: "elderly_or_moderate4_7_or_sudden_or_back", label: "≥65y / pain 4–7 / sudden / back pain / possibly pregnant", level: 3 },
      { key: "colicky_or_vomiting", label: "Colicky ± vomiting", level: 4 },
      { key: "chronic_or_reduced", label: "Chronic/repeated or pain reduced", level: 5 },
    ],
    "Non-Emergency / Administrative": [
      { key: "dressing_change", label: "Came for dressing change (L5)", level: 5 },
      { key: "scheduled_medical_checkup", label: "Came for scheduled medical check-up (L5)", level: 5 },
      { key: "repeat_prescription", label: "Repeat prescription / medication refill (L5)", level: 5 },
      { key: "suture_removal", label: "Suture / staple removal (L5)", level: 5 },
      { key: "vaccination", label: "Vaccination / immunisation (L5)", level: 5 },
      { key: "medical_report", label: "Request for medical report / forms (L5)", level: 5 },
    ],
  },
  paeds: {
    "Fever (Paeds)": [
      { key: "rash_or_ams_or_seizures", label: "Rash/AMS/seizures/immunocompromised/septic", level: 2 },
      { key: "fever_gt5d_or_infant_lt3m", label: ">5 days or infant <3 months / other red flags", level: 3 },
      { key: "afebrile_now", label: "Not currently febrile; well", level: 4 },
    ],
  }
};

// === Vitals escalation ===
function vitalsEscalation({ ageYears, sbp, dbp, hr, rr, spo2, tempC, extraFlags }) {
  const SBP = parseInt(sbp), DBP = parseInt(dbp), HR = parseInt(hr), RR = parseInt(rr);
  const SpO2 = parseInt(spo2), T = tempC !== "" ? parseFloat(tempC) : NaN;
  const isAdult = ageYears >= 12;
  let level = 5;
  const reasons = [];

  if (isAdult) {
    if (!isNaN(SBP) && SBP < 90) { level = Math.min(level, 2); reasons.push("SBP < 90 → hypotension → L2"); }
    if (!isNaN(SBP) && SBP >= 200) { level = Math.min(level, 2); reasons.push("SBP ≥ 200 → severe hypertension → L2"); }
    if (!isNaN(DBP) && DBP >= 120) { level = Math.min(level, 2); reasons.push("DBP ≥ 120 → severe hypertension → L2"); }
    if ((!isNaN(SBP) && SBP >= 180) || (!isNaN(DBP) && DBP >= 110)) { level = Math.min(level, 3); reasons.push("SBP ≥ 180 or DBP ≥ 110 → L3"); }
    if (!isNaN(HR) && HR > 150) { level = Math.min(level, 2); reasons.push("HR > 150 → L2"); }
    if (!isNaN(HR) && HR > 130) { level = Math.min(level, 3); reasons.push("HR > 130 → L3"); }
    if (!isNaN(HR) && HR < 40)  { level = Math.min(level, 2); reasons.push("HR < 40 → L2"); }
    if (!isNaN(RR) && (RR > 30 || RR < 8)) { level = Math.min(level, 2); reasons.push("RR >30 or <8 → L2"); }
    if (!isNaN(RR) && RR >= 24 && (isNaN(SpO2) || SpO2 <= 94)) { level = Math.min(level, 3); reasons.push("RR ≥24 with SpO₂ ≤94/unknown → L3"); }
    if (!isNaN(SpO2) && SpO2 < 92) { level = Math.min(level, 2); reasons.push("SpO₂ < 92% → L2"); }
    else if (!isNaN(SpO2) && SpO2 <= 94) { level = Math.min(level, 3); reasons.push("SpO₂ 92–94% → L3"); }
    if (!isNaN(T) && T >= 39 && (extraFlags.immunocompromised || extraFlags.pregnant20wPlus)) { level = Math.min(level, 2); reasons.push("Temp ≥39°C + high-risk host → L2"); }
  } else {
    if (!isNaN(SpO2) && SpO2 < 92) { level = Math.min(level, 2); reasons.push("Paeds SpO₂ < 92% → L2"); }
    else if (!isNaN(SpO2) && SpO2 < 94) { level = Math.min(level, 3); reasons.push("Paeds SpO₂ 92–94% → L3"); }
    if (!isNaN(RR) && RR > 40) { level = Math.min(level, 3); reasons.push("Paeds RR elevated → L3"); }
    if (!isNaN(SBP) && SBP < 70 + 2*(ageYears)) { level = Math.min(level, 2); reasons.push("Paeds hypotension (70+2*age) → L2"); }
    if (!isNaN(T) && T >= 39 && ageYears < 0.25) { level = Math.min(level, 2); reasons.push("Infant <3m with fever ≥39°C → L2"); }
  }
  return { level, reasons };
}

// === Safety floors (skip missing-vitals cap for baseline L5) ===
function safetyFloors(baselineLevel, { age, conservative, complaintKey, sbp, dbp, hr, rr, spo2 }) {
  let level = 5; const reasons = [];
  if (conservative) {
    const missingCount = [sbp, dbp, hr, rr, spo2].filter(Boolean).length;
    if (baselineLevel !== 5 && missingCount <= 3) {
      level = Math.min(level, 3);
      reasons.push("Safety: ≥2 core vitals missing → cap at L3");
    }
    if (parseInt(age) >= 65 && ["Chest Pain","Shortness of Breath","Abdominal Pain","Headache","Syncope/Collapse"].includes(complaintKey)) {
      level = Math.min(level, 3);
      reasons.push("Safety: age ≥65 with high-risk complaint → ≥L3");
    }
  }
  return { level, reasons };
}

export default function App() {
  const [view, setView] = useState("triage"); // "triage" | "about" | "me"

  // Patient inputs
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [sbp, setSbp] = useState(""); const [dbp, setDbp] = useState("");
  const [hr, setHr]   = useState(""); const [rr, setRr]   = useState("");
  const [spo2, setSpo2] = useState(""); const [tempC, setTempC] = useState("");
  const [immunocomp, setImmunocomp] = useState(false);
  const [preg20, setPreg20] = useState(false);

  // Complaint inputs
  const [complaintKey, setComplaintKey] = useState("");
  const [modifierKey, setModifierKey] = useState("");
  const [conservative, setConservative] = useState(true);
  const [search, setSearch] = useState("");

  const isAdult = useMemo(() => parseInt(age) >= 12, [age]);
  const setAdult = isAdult ? COMPLAINTS.adult : COMPLAINTS.paeds;
  const complaintNames = Object.keys(setAdult).filter(k => k.toLowerCase().includes(search.toLowerCase()));

  function complaintLevel() {
    const mods = setAdult[complaintKey];
    const sel = mods?.find(m => m.key === modifierKey);
    if (sel) return { level: sel.level, reasons: [`${complaintKey}: ${sel.label} → L${sel.level}`] };
    return { level: 5, reasons: ["No complaint selected — vitals-only assessment applied"] };
  }

  const c = complaintLevel();

  const v = vitalsEscalation({
    ageYears: parseInt(age) || 0,
    sbp, dbp, hr, rr, spo2, tempC,
    extraFlags: { immunocompromised: immunocomp, pregnant20wPlus: preg20 && gender === "female" }
  });

  const s = safetyFloors(c.level, { age, conservative, complaintKey, sbp, dbp, hr, rr, spo2 });

  const finalLevel = Math.min(c.level, v.level, s.level);
  const meta = TRIAGE_META[finalLevel];
  const reasons = [...c.reasons, ...v.reasons, ...s.reasons];
  const disabled = !age || !gender;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <header className="sticky top-0 bg-white/90 backdrop-blur p-3 rounded-xl shadow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">MyTriage+ (MTS 2022 — Full)</h1>
              <p className="text-xs text-slate-600">Decision-support — clinical judgement required.</p>
            </div>
            {view === "triage" && (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={conservative} onChange={e=>setConservative(e.target.checked)} />
                Safety-first mode
              </label>
            )}
          </div>

          {/* Tabs */}
          <nav className="mt-3 flex gap-2 text-sm">
            <button onClick={()=>setView("triage")} className={`px-3 py-1 rounded ${view==='triage'?'bg-slate-900 text-white':'bg-slate-100'}`}>Triage</button>
            <button onClick={()=>setView("about")} className={`px-3 py-1 rounded ${view==='about'?'bg-slate-900 text-white':'bg-slate-100'}`}>About This Tool</button>
            <button onClick={()=>setView("me")} className={`px-3 py-1 rounded ${view==='me'?'bg-slate-900 text-white':'bg-slate-100'}`}>About Me</button>
          </nav>
        </header>

        {/* TRIAGE VIEW */}
        {view === "triage" && (
          <>
            {/* Patient details */}
            <section className="bg-white p-4 rounded-xl space-y-3 shadow">
              <div className="grid grid-cols-2 gap-2">
                <input className="border p-2 rounded" placeholder="Age (years)" type="number" value={age} onChange={e=>setAge(e.target.value)} />
                <select className="border p-2 rounded" value={gender} onChange={e=>setGender(e.target.value)}>
                  <option value="">Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border p-2 rounded" placeholder="SBP" value={sbp} onChange={e=>setSbp(e.target.value)} />
                <input className="border p-2 rounded" placeholder="DBP" value={dbp} onChange={e=>setDbp(e.target.value)} />
                <input className="border p-2 rounded" placeholder="HR" value={hr} onChange={e=>setHr(e.target.value)} />
                <input className="border p-2 rounded" placeholder="RR" value={rr} onChange={e=>setRr(e.target.value)} />
                <input className="border p-2 rounded" placeholder="SpO₂ (%)" value={spo2} onChange={e=>setSpo2(e.target.value)} />
                <input className="border p-2 rounded" placeholder="Temp (°C)" value={tempC} onChange={e=>setTempC(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={immunocomp} onChange={e=>setImmunocomp(e.target.checked)} />
                  Immunocompromised
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={preg20} onChange={e=>setPreg20(e.target.checked)} disabled={gender !== "female"} />
                  Pregnancy ≥20w / postpartum ≤6w
                </label>
              </div>
            </section>

            {/* Complaints */}
            <section className="bg-white p-4 rounded-xl space-y-3 shadow">
              <div className="grid gap-2">
                <input className="border p-2 rounded" placeholder="Search complaint…" value={search} onChange={e=>setSearch(e.target.value)} />
                <select className="border p-2 rounded w-full" value={complaintKey} onChange={e=>{setComplaintKey(e.target.value); setModifierKey("");}}>
                  <option value="">Select complaint</option>
                  {Object.keys(setAdult).filter(k => k.toLowerCase().includes(search.toLowerCase())).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {complaintKey && (
                <select className="border p-2 rounded w-full" value={modifierKey} onChange={e=>setModifierKey(e.target.value)}>
                  <option value="">Select modifier</option>
                  {setAdult[complaintKey]?.map(m => <option key={m.key} value={m.key}>{m.label} (L{m.level})</option>)}
                </select>
              )}
            </section>

            {/* Result */}
            <section className="bg-white p-4 rounded-xl shadow">
              <h2 className="font-bold mb-2">Triage Result</h2>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-12 rounded ${TRIAGE_META[finalLevel]?.color || 'bg-slate-300'}`}></div>
                <div>
                  <div className="text-2xl font-bold">Level {finalLevel}</div>
                  <div>{TRIAGE_META[finalLevel]?.name}</div>
                  <div className="text-xs text-slate-600">Time to treatment: {TRIAGE_META[finalLevel]?.tt}</div>
                </div>
              </div>
              <ul className="list-disc pl-4 mt-2 text-sm">
                {reasons.map((r,i) => <li key={i}>{r}</li>)}
              </ul>
              {disabled && (
                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  Age and gender are mandatory.
                </div>
              )}
            </section>

            <footer className="text-xs text-slate-600 pb-20">
              Primary users: Assistant Medical Officer / Medical Assistant (Malaysia).<br />
              Decision-support only — not a decision-making tool. Always use clinical judgement.
            </footer>
            <div className="fixed bottom-0 left-0 right-0 bg-amber-100 border-t border-amber-300 text-amber-900 text-xs p-2 text-center shadow-inner">
              Safety-first: when in doubt, escalate; document vitals & modifiers clearly.
            </div>
          </>
        )}

        {/* ABOUT PAGES */}
        {view === "about" && (
          <section className="bg-white p-4 rounded-xl shadow">
            <AboutTool />
          </section>
        )}
        {view === "me" && (
          <section className="bg-white p-4 rounded-xl shadow">
            <AboutMe />
          </section>
        )}
      </div>
    </div>
  );
}
