import React, { useMemo, useState } from "react";

/** MyTriage+ — MTS 2022 (Revised) FULL complaint set + L5 tasks
 * Decision-support only — clinical judgement required.
 * Baseline level from complaint/modifier, then add:
 *  - Physiological discriminators (vitalsEscalation)
 *  - Safety-first floors (missing vitals, age ≥65 + high-risk)
 * Final level = most urgent (min) of the three.
 */

const TRIAGE_META = {
  1: { name: "Resuscitation", color: "bg-red-600", tt: "0 min (immediate)" },
  2: { name: "Emergency", color: "bg-orange-500", tt: "<10 min" },
  3: { name: "Urgent", color: "bg-yellow-400", tt: "<30 min" },
  4: { name: "Early Care", color: "bg-green-500", tt: "<60 min" },
  5: { name: "Routine", color: "bg-blue-500", tt: "<90 min" },
};

// ---- Complaint catalogue (Adult + Paeds) ----
// Structure: { [group]: { [complaint]: [ {key,label,level}, ... ] } }
// Levels derived from PDF discriminators; wording condensed for UI.
const COMPLAINTS = {
  adult: {
    // Airway / Breathing
    "Shortness of Breath": [
      { key: "stridor_or_ams_or_exhausted", label: "Stridor / AMS / exhausted", level: 2 },
      { key: "wheeze_rr_fast", label: "Wheeze + fast RR; airway intact", level: 3 },
      { key: "mild", label: "Mild, RR near normal", level: 4 },
    ],
    "Respiratory (Cough/Wheeze/URTI)": [
      { key: "distress_or_fb_or_voice_change", label: "Distress / airway FB / voice change", level: 2 },
      { key: "wheeze_known_asthma_or_hypervent_spo2_lt_98", label: "Wheeze (asthma) / hypervent SpO₂ < 98%", level: 3 },
      { key: "mild_urti", label: "Mild URTI only", level: 4 },
    ],

    // Cardio / Circulation
    "Chest Pain": [
      { key: "ongoing_or_new_lt6h_high_susp", label: "Ongoing / new <6h, high suspicion", level: 2 },
      { key: "reduced_or_gt6h_intermediate", label: ">6h or reduced; intermediate risk", level: 3 },
      { key: "persisting_mild_low_risk", label: "Persisting mild; low risk", level: 4 },
      { key: "resolved_low_risk", label: "Resolved; low risk; normal ECG", level: 5 },
    ],
    "Palpitations": [
      { key: "with_abnormal_ecg_or_vitals_or_ongoing_chest_pain", label: "Abnormal ECG/vitals or ongoing chest pain/AMS", level: 2 },
      { key: "with_syncope_or_cp", label: "With syncope or chest pain", level: 3 },
      { key: "mild", label: "Mild palpitations only", level: 4 },
    ],
    "Syncope/Collapse": [
      { key: "ams_or_neurodeficit_or_purpura_arrhyth", label: "AMS / neuro deficit / purpura / noted arrhythmia", level: 2 },
      { key: "improved_but_deficit_persists_gt12h", label: "Improved but deficit persists >12h", level: 3 },
      { key: "full_recovery", label: "Full recovery, no deficits", level: 4 },
    ],

    // Neurology
    "Seizures": [
      { key: "ongoing_or_trauma_or_meningism", label: "Ongoing / trauma / meningism / OD", level: 2 },
      { key: "first_or_postictal_or_neurodef_or_fever", label: "First / post-ictal / neuro deficit / fever / Na/Glc abn", level: 3 },
      { key: "known_epilepsy_recovered", label: "Known epilepsy; full recovery / med review", level: 4 },
    ],
    "Headache": [
      { key: "sudden_severe_or_neurodef_or_meningism", label: "Sudden severe / neuro deficit / meningism", level: 2 },
      { key: "pain_gt4_or_visual_speech_disturbance", label: "Pain >4 or visual/speech disturbance / ataxia", level: 3 },
      { key: "typical_mild", label: "Typical migraine/tension; mild", level: 4 },
    ],
    "Altered Mental State": [
      { key: "seizures_or_deficit_or_agitated", label: "With seizures / neuro deficit / agitated", level: 2 },
      { key: "confused_or_hypogly_glc_lt_2_5", label: "Confused / glucose <2.5", level: 3 },
      { key: "psychiatric_history_improved", label: "Psych history; improved", level: 4 },
    ],
    "Dizziness/Vertigo": [
      { key: "ams_or_neurodeficit", label: "AMS / focal deficits", level: 2 },
      { key: "visual_speech_ataxia_gait", label: "Visual/speech disturbance / ataxia/gait", level: 3 },
      { key: "symptoms_only", label: "Symptoms only", level: 4 },
    ],

    // GI / GU
    "Abdominal Pain": [
      { key: "bleeding_rigid_or_severe8_10", label: "Bleeding PR/PO, rigid abdomen, severe 8–10", level: 2 },
      { key: "elderly_or_moderate4_7_or_sudden_or_back", label: "≥65y / pain 4–7 / sudden / back pain / possibly pregnant", level: 3 },
      { key: "colicky_or_vomiting", label: "Colicky ± vomiting", level: 4 },
      { key: "chronic_or_reduced", label: "Chronic/repeated or pain reduced", level: 5 },
    ],
    "Diarrhoea/Vomiting": [
      { key: "fresh_blood_pr_or_haematemesis_or_ams", label: "Fresh PR blood / haematemesis / AMS", level: 2 },
      { key: "bloody_or_melena_or_coffee_or_anticoag", label: "Bloody / melena / coffee-ground / anticoagulant", level: 3 },
      { key: "persisting_vomiting_or_unable_oral", label: "Persisting vomiting or unable to tolerate orally", level: 4 },
      { key: "single_mild", label: "Single small episode; stable; tolerating", level: 5 },
    ],
    "Genitourinary": [
      { key: "acute_retention_or_frank_haematuria_or_severe_scrotal_pain", label: "Acute retention / frank haematuria / severe scrotal pain", level: 2 },
      { key: "painless_swelling_or_mild", label: "Painless swelling / mild urinary Sx", level: 4 },
    ],

    // Fever / Infectious
    "Fever (Adult)": [
      { key: "septic_ill_or_temp_gt39_or_lt36_or_immunocomp_or_severe_pain", label: "Septic/ill; Temp >39 or <36; immunocompromised; severe pain", level: 2 },
      { key: "temp_37_5_39_or_appears_unwell", label: "Temp 37.5–39; appears unwell", level: 3 },
      { key: "history_only", label: "History of fever; afebrile now", level: 4 },
      { key: "no_fever_no_pain", label: "No fever; no pain", level: 5 },
    ],
    "Dengue (Suspected)": [
      { key: "warning_signs_or_shock_indices", label: "Onset 3–6d + lethargy, SBP<HR, pulse pressure <30", level: 2 },
      { key: "abdo_pain_or_persistent_vomit_or_hct_high", label: "Abdo pain / persistent vomiting / HCT high", level: 3 },
      { key: "no_warning_with_risk", label: "No warning, but elderly/pregnant/CCF/CKD/CLD/obese/immunocomp", level: 3 },
      { key: "no_warning_low_risk", label: "No warning signs, low risk", level: 4 },
    ],

    // Trauma
    "Trauma — Head/Neck": [
      { key: "penetrating_or_high_velocity_or_active_bleed_or_ams", label: "Penetrating / high velocity / active bleeding / AMS", level: 2 },
      { key: "scalp_wound_or_amnesia_or_neck_pain", label: "Scalp wound / amnesia / neck pain / distracting pain", level: 3 },
      { key: "brief_loc_or_mild", label: "Fully conscious; brief LOC; elderly", level: 3 },
      { key: "mild_only", label: "Mild symptoms only", level: 4 },
    ],
    "Trauma — Limb": [
      { key: "mangled_or_prox_amputation_or_ongoing_bleed", label: "Mangled; proximal amputation; ongoing bleed", level: 1 },
      { key: "distal_amputation_or_open_fracture_or_dislocation", label: "Distal amputation / open # / dislocation / nerve-tendon injury", level: 2 },
      { key: "small_bone_fracture_likely", label: "Small bone fracture likely", level: 3 },
      { key: "unlikely_fracture", label: "Unlikely fracture; mild", level: 4 },
    ],
    "Wounds/Skin": [
      { key: "arterial_bleed_or_degloving_or_multiple_penetrating_or_chem_burn", label: "Arterial bleed / degloving / multiple penetrating / burns (chem)", level: 2 },
      { key: "continuing_venous_bleed_or_complications", label: "Continuing venous bleed / wound or surgical complications", level: 3 },
      { key: "new_mild", label: "New minor wound / mild symptoms", level: 4 },
    ],
    "Burns/Scalds": [
      { key: "inhalational_or_electrical_or_chem_or_facial_or_gt15", label: "Inhalational / lightning/electrical/chemical / face / >15%", level: 2 },
      { key: "hands_feet_joints_perineum_or_circumferential", label: "Hands/feet/joints/perineum or circumferential", level: 3 },
      { key: "pain_main", label: "Pain main symptom / small area", level: 4 },
    ],
    "Fall": [
      { key: "ams_or_neurodef", label: "AMS / neuro deficit", level: 2 },
      { key: "limb_injury_or_vascular_injury_or_height_gt6m", label: "Limb injury/deformity / vascular injury / >6m", level: 2 },
      { key: "pain_main", label: "Pain main symptom", level: 4 },
    ],

    // ENT/Eye
    "ENT": [
      { key: "airway_obstruction_or_active_epistaxis_or_dysphagia", label: "Airway obstruction / active epistaxis / dysphagia", level: 2 },
      { key: "foreign_body_ent", label: "Foreign body ENT", level: 3 },
      { key: "other_ent", label: "Other ENT minor", level: 4 },
    ],
    "Eye/Vision": [
      { key: "penetrating_or_chemical_or_direct_trauma", label: "Penetrating / chemical / direct trauma", level: 2 },
      { key: "sudden_vision_loss_or_painful_red_eye_or_fb", label: "Sudden vision loss / painful red eye / FB / post-op <1w", level: 3 },
      { key: "other_eye", label: "Other eye presentations", level: 4 },
    ],

    // Allergy/Anaphylaxis
    "Allergy/Anaphylaxis": [
      { key: "airway_compromise_or_near_faint", label: "Face/tongue oedema; unable swallow; speaking diff; near-faint", level: 2 },
      { key: "rash_abdo_pain_vomit_diarrhoea_or_toxin", label: "Rash; abdo pain; V/D; chemical/toxin; pain main symptom", level: 3 },
      { key: "local_swelling_pruritus_only", label: "Local swelling / itch only", level: 4 },
    ],

    // Pregnancy
    "Pregnancy <20 weeks": [
      { key: "active_pv_bleed_or_bp_gt_140_90", label: "Active PV bleeding or BP > 140/90", level: 2 },
      { key: "likely_abortion_or_persistent_vomit_or_urinary_sx", label: "Likely abortion; persistent vomiting; urinary symptoms", level: 3 },
      { key: "not_preg_related", label: "Symptoms not pregnancy-related", level: 4 },
    ],
    "Pregnancy ≥20w to ≤6w postpartum": [
      { key: "seizure_or_active_labour_or_massive_pv_or_septic", label: "Seizures; active labour; massive PV; septic; major trauma", level: 2 },
      { key: "limb_trauma_or_pv_bleed_or_lower_abdo_pain_or_bp_gt_140_90", label: "Limb trauma; PV bleed; lower abdo pain; BP>140/90", level: 3 },
      { key: "vomit_or_urinary", label: "Persistent vomiting / urinary Sx only", level: 4 },
    ],

    // Psychiatric
    "Psychiatric/Behavioural": [
      { key: "airway_threat_or_overdose", label: "Airway threatened or overdose", level: 2 },
      { key: "risk_self_harm_or_need_sedation_restraint", label: "Risk self-harm; needs sedation/restraint", level: 3 },
      { key: "calm_nonsuicidal", label: "Calm, non-suicidal", level: 4 },
    ],

    // Environmental / Hazmat
    "Environmental/Hazmat": [
      { key: "chemical_inhalation_or_heatstroke_gt39_or_near_drowning_post_resus", label: "Chemical inhalation; heatstroke >39; near-drowning post-resus", level: 2 },
      { key: "heat_related_or_household_electric_or_skin_exposure_post_decon", label: "Heat related; household electric; skin exposure post-decon", level: 3 },
      { key: "mild_or_recovered", label: "Mild or recovered", level: 4 },
    ],

    // Admin / L5 non-emergency
    "Non-Emergency / Administrative": [
      { key: "dressing_change", label: "Came for dressing change", level: 5 },
      { key: "scheduled_medical_checkup", label: "Came for scheduled medical check-up", level: 5 },
      { key: "repeat_prescription", label: "Repeat prescription / medication refill", level: 5 },
      { key: "suture_removal", label: "Suture / staple removal", level: 5 },
      { key: "vaccination", label: "Vaccination / immunisation", level: 5 },
      { key: "medical_report", label: "Request for medical report / forms", level: 5 },
    ],
  },

  // Paediatrics
  paeds: {
    "Fever (Paeds)": [
      { key: "rash_or_ams_or_seizures_or_immunocomp_or_septic", label: "Rash/AMS/seizures/immunocompromised/septic", level: 2 },
      { key: "fever_gt5d_or_swollen_joint_or_headache_or_drug_reaction_or_infant_lt3m", label: ">5 days; limb/joint swelling; headache; drug reaction; infant <3m", level: 3 },
      { key: "poor_oral_intake_or_mod_dehydration", label: "Poor oral intake / moderate dehydration", level: 3 },
      { key: "afebrile_now", label: "Not currently febrile; well", level: 4 },
    ],
    "Crying Infant": [
      { key: "lethargic_not_feeding_floppy_coldp_t_gt38_rash", label: "Lethargic; not feeding; floppy; cold periph; T>38; rash", level: 2 },
      { key: "inconsolable_or_prolonged_gt2h", label: "Inconsolable or prolonged >2h", level: 3 },
      { key: "intermittent_afebrile_feeding_norm", label: "Intermittent; afebrile; feeding normally", level: 4 },
    ],
    "Respiratory (Paeds)": [
      { key: "airway_sounds_or_cyanosis_or_fb_or_tripod_prev_icu", label: "Abnormal airway sounds; cyanosis; airway FB; tripod; prev ICU", level: 2 },
      { key: "swallowed_fb_or_overdose_allergy_injury_or_poor_feeding", label: "Swallowed FB; OD/allergy/injury-linked; poor feeding", level: 3 },
      { key: "mild_urti_or_tolerating", label: "Mild URTI; tolerating orally", level: 4 },
    ],
    "Abdominal Pain (Paeds)": [
      { key: "lethargy_toxic_bleeding_bilious_currantjelly_obstruct_mass_jaundice", label: "Lethargy/toxic; PR/PO bleed; bilious; currant jelly; obstruction; mass; jaundice", level: 2 },
      { key: "febrile_or_projectile_or_severe_gt7", label: "Febrile; projectile vomiting; severe pain >7", level: 3 },
      { key: "colicky_or_urinary_or_pain_gt4_or_mod_dehydration", label: "Colicky; urinary Sx; pain >4; moderate dehydration", level: 3 },
      { key: "intermittent_active_oral", label: "Intermittent; active; taking orally", level: 4 },
    ],
    "Dengue (Paeds)": [
      { key: "warning_signs_or_shock", label: "Onset 3–6d + lethargy; resp distress; shock", level: 2 },
      { key: "abdo_pain_or_persist_vomit_or_transfer", label: "Abdo pain; persistent vomiting; inter-facility transfer", level: 3 },
      { key: "no_warning_risk_or_infant_lt1y", label: "No warning + chronic disease / referred / infant <1y", level: 3 },
      { key: "no_warning_lowrisk", label: "No warning signs; low risk", level: 4 },
    ],
    "Seizures (Paeds)": [
      { key: "ongoing_or_od_or_rash_or_trauma_or_meningism", label: "Ongoing; OD; rash; trauma; neck stiffness", level: 2 },
      { key: "postictal_or_abn_na_glc_or_neurodef_or_headache_fever_or_anticoag", label: "Post-ictal; Na/Glc abn; neurodef; headache/fever; anticoag", level: 3 },
      { key: "first_seizure_or_epilepsy_recovered", label: "First seizure (stable) or epilepsy recovered", level: 3 },
    ],
    "Trauma — Head/Neck (Paeds)": [
      { key: "penetrating_or_high_velocity_or_active_bleed_or_ams", label: "Penetrating/high velocity/active bleed/AMS", level: 2 },
      { key: "scalp_wound_or_amnesia_or_neck_pain", label: "Scalp wounds; amnesia; neck pain; distracting pain", level: 3 },
      { key: "brief_loc_or_no_symptoms", label: "Fully conscious; brief LOC only / no symptoms", level: 4 },
    ],
    "Trauma — Limb (Paeds)": [
      { key: "mangled_or_prox_amputation_or_ongoing_bleed", label: "Mangled; proximal amputation; ongoing bleed", level: 1 },
      { key: "distal_amputation_or_open_fracture_or_dislocation", label: "Distal amputation; dislocation; open #; tendon/nerve injury", level: 2 },
      { key: "small_bone_or_pulses_felt", label: "Small bone # likely / pulses present", level: 3 },
      { key: "mild_or_unlikely_fracture", label: "Mild symptoms; unlikely fracture", level: 4 },
    ],
    "Eye/ENT (Paeds)": [
      { key: "penetrating_or_chemical_or_trauma", label: "Penetrating; chemical; direct trauma", level: 2 },
      { key: "sudden_vision_loss_or_painful_red_eye_or_ent_fb", label: "Sudden vision loss; painful red eye; ENT FB; hoarse voice", level: 3 },
      { key: "other_minor", label: "Other minor ENT/Eye", level: 4 },
    ],
    "Follow-up / Return Visit (Paeds)": [
      { key: "tight_cast_or_immunocomp_or_postchemo", label: "Tight cast; immunocompromised; post-chemotherapy", level: 2 },
      { key: "post_daycare_surgery_or_return_2x", label: "Post-daycare surgery; return visit ≥2x", level: 3 },
      { key: "any_return_visit", label: "Any return visit to any healthcare facility", level: 4 },
    ],
  },
};

// ---- Physiological discriminators (conservative, MTS-aligned) ----
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
    if ((!isNaN(SBP) && SBP >= 180) || (!isNaN(DBP) && DBP >= 110)) { level = Math.min(level, 3); reasons.push("SBP ≥ 180 or DBP ≥ 110 → hypertensive urgency → L3"); }
    if (!isNaN(HR) && HR > 150) { level = Math.min(level, 2); reasons.push("HR > 150 → significant tachycardia → L2"); }
    if (!isNaN(HR) && HR > 130) { level = Math.min(level, 3); reasons.push("HR > 130 → tachycardia → L3"); }
    if (!isNaN(HR) && HR < 40)  { level = Math.min(level, 2); reasons.push("HR < 40 → bradycardia → L2"); }
    if (!isNaN(RR) && (RR > 30 || RR < 8)) { level = Math.min(level, 2); reasons.push("RR >30 or <8 → critical ventilation → L2"); }
    if (!isNaN(RR) && RR >= 24 && (isNaN(SpO2) || SpO2 <= 94)) { level = Math.min(level, 3); reasons.push("RR ≥24 with SpO₂ ≤94/unknown → L3"); }
    if (!isNaN(SpO2) && SpO2 < 92) { level = Math.min(level, 2); reasons.push("SpO₂ < 92% RA → hypoxia → L2"); }
    else if (!isNaN(SpO2) && SpO2 <= 94) { level = Math.min(level, 3); reasons.push("SpO₂ 92–94% → desaturation → L3"); }
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

// ---- App ----
export default function App() {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [sbp, setSbp] = useState(""); const [dbp, setDbp] = useState("");
  const [hr, setHr] = useState("");   const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState(""); const [tempC, setTempC] = useState("");
  const [immunocomp, setImmunocomp] = useState(false);
  const [preg20, setPreg20] = useState(false);

  const [complaintKey, setComplaintKey] = useState("");
  const [modifierKey, setModifierKey] = useState("");
  const [conservative, setConservative] = useState(true);
  const [search, setSearch] = useState("");

  const isAdult = useMemo(() => parseInt(age) >= 12, [age]);

  function complaintLevel() {
    const set = (isAdult ? COMPLAINTS.adult : COMPLAINTS.paeds);
    // Flatten to a searchable list of complaint names
    const itemList = Object.keys(set);
    const mods = set[complaintKey];
    const sel = mods?.find(m => m.key === modifierKey);
    if (sel) return { level: sel.level, reasons: [`${complaintKey}: ${sel.label} → L${sel.level}`] };
    return { level: 5, reasons: ["No complaint selected — vitals-only assessment applied"] };
  }

  function safetyFloors() {
    let level = 5; const reasons = [];
    if (conservative) {
      const missing = [sbp, dbp, hr, rr, spo2].filter(Boolean).length;
      if (missing <= 3) { level = Math.min(level, 3); reasons.push("Safety: ≥2 core vitals missing → cap at L3"); }
      if (parseInt(age) >= 65 && ["Chest Pain","Shortness of Breath","Abdominal Pain","Headache","Syncope/Collapse"].includes(complaintKey)) {
        level = Math.min(level, 3); reasons.push("Safety: age ≥65 with high-risk complaint → ≥L3");
      }
    }
    return { level, reasons };
  }

  const c = complaintLevel();
  const v = vitalsEscalation({
    ageYears: parseInt(age) || 0, sbp, dbp, hr, rr, spo2, tempC,
    extraFlags: { immunocompromised: immunocomp, pregnant20wPlus: preg20 && gender === "female" }
  });
  const s = safetyFloors();
  const finalLevel = Math.min(c.level, v.level, s.level);
  const meta = TRIAGE_META[finalLevel];
  const reasons = [...c.reasons, ...v.reasons, ...s.reasons];

  // UI helpers
  const setAdult = isAdult ? COMPLAINTS.adult : COMPLAINTS.paeds;
  const complaintNames = Object.keys(setAdult).filter(k => k.toLowerCase().includes(search.toLowerCase()));

  const disabled = !age || !gender;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <header className="sticky top-0 bg-white/90 backdrop-blur p-3 rounded-xl flex flex-wrap justify-between items-center gap-2 shadow">
          <div>
            <h1 className="text-xl font-bold">MyTriage+ (MTS 2022 — Full)</h1>
            <p className="text-xs text-slate-600">Decision-support — clinical judgement required.</p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={conservative} onChange={e=>setConservative(e.target.checked)} />
            Safety-first mode
          </label>
        </header>

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
              {complaintNames.map(c => <option key={c}>{c}</option>)}
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
      </div>
    </div>
  );
}
