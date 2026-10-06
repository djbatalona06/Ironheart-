"use client";

import { useActionState, useState } from "react";
import { finishOnboarding } from "./actions";
import { SURVEY_QUESTIONS } from "./survey";

const STEPS = ["You", "Goal", "Quick start", "Body", "Nutrition", "Partner"] as const;
const GOALS = [["muscle", "Build muscle"], ["fat_loss", "Lose fat"], ["strength", "Get stronger"], ["endurance", "Endurance"]];
const ACTIVITY = [["sedentary", "Desk job, little exercise"], ["light", "Light: 1–3 days/week"],
  ["moderate", "Moderate: 3–5 days/week"], ["active", "Active: 6–7 days/week"], ["very_active", "Very active / physical job"]];

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(finishOnboarding, {});
  const last = STEPS.length - 1;
  const show = (i: number) => (step === i ? "space-y-4" : "hidden");

  // One form across steps so every field submits together; hidden steps keep their values.
  return (
    <form action={action} className="space-y-6" onKeyDown={(e) => e.key === "Enter" && step < last && e.preventDefault()}>
      <div aria-label={`Step ${step + 1} of ${STEPS.length}`} className="flex gap-1">
        {STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded ${i <= step ? "bg-gold" : "bg-line"}`} />)}
      </div>

      <section className={show(0)}>
        <h1 className="display text-4xl">Who are you?</h1>
        <label className="block space-y-1"><span className="text-sm text-muted">Name</span>
          <input name="name" className="field" required maxLength={60} defaultValue={defaultName} /></label>
        <label className="block space-y-1"><span className="text-sm text-muted">@handle (partners find you by this)</span>
          <input name="handle" className="field lowercase" required pattern="[a-z0-9_]{3,20}" maxLength={20}
            placeholder="iron_mike" autoCapitalize="none" /></label>
      </section>

      <section className={show(1)}>
        <h1 className="display text-4xl">Training goal</h1>
        {GOALS.map(([v, label], i) => (
          <label key={v} className="card flex min-h-11 items-center gap-3 p-3 has-checked:border-gold">
            <input type="radio" name="goal" value={v} defaultChecked={i === 0} className="accent-gold" />{label}
          </label>
        ))}
      </section>

      <section className={show(2)}>
        <h1 className="display text-4xl">Quick start</h1>
        <p className="text-sm text-muted">Three quick questions so we can tailor things. Skip any you like.</p>
        {SURVEY_QUESTIONS.map((q) => (
          <fieldset key={q.key} className="space-y-2">
            <legend className="mb-1 text-sm text-muted">{q.label}</legend>
            {q.options.map(([v, l]) => (
              <label key={v} className="card flex min-h-11 items-center gap-3 p-3 has-checked:border-gold">
                <input type="radio" name={q.key} value={v} className="accent-gold" />{l}
              </label>
            ))}
          </fieldset>
        ))}
      </section>

      <section className={show(3)}>
        <h1 className="display text-4xl">Body stats</h1>
        <p className="text-sm text-muted">Used only to calculate your calorie and macro goals. Skip if you like.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-sm text-muted">Weight (kg)</span>
            <input name="weight_kg" type="number" inputMode="decimal" step="0.1" min={25} max={400} className="field" /></label>
          <label className="space-y-1"><span className="text-sm text-muted">Height (cm)</span>
            <input name="height_cm" type="number" inputMode="numeric" min={100} max={250} className="field" /></label>
          <label className="space-y-1"><span className="text-sm text-muted">Birth year</span>
            <input name="birth_year" type="number" inputMode="numeric" min={1900} max={2020} className="field" /></label>
          <label className="space-y-1"><span className="text-sm text-muted">Sex</span>
            <select name="sex" className="field" defaultValue=""><option value="">—</option>
              <option value="male">Male</option><option value="female">Female</option></select></label>
        </div>
        <label className="block space-y-1"><span className="text-sm text-muted">Activity level</span>
          <select name="activity_level" className="field" defaultValue=""><option value="">—</option>
            {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </section>

      <section className={show(4)}>
        <h1 className="display text-4xl">Track nutrition?</h1>
        {[["yes", "Yes, track calories and macros"], ["no", "No, just training"]].map(([v, l], i) => (
          <label key={v} className="card flex min-h-11 items-center gap-3 p-3 has-checked:border-gold">
            <input type="radio" name="nutrition_enabled" value={v} defaultChecked={i === 0} className="accent-gold" />{l}
          </label>
        ))}
      </section>

      <section className={show(5)}>
        <h1 className="display text-4xl">Train with someone</h1>
        <p className="text-muted">Pair with a partner, set a weekly goal and a stake. Miss it and you owe.</p>
        <button name="next" value="pact" className="btn-gold w-full" disabled={pending}>Invite a partner now</button>
        <button name="next" value="home" className="btn-ghost w-full" disabled={pending}>Later</button>
      </section>

      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

      {step < last && (
        <div className="flex gap-3">
          {step > 0 && <button type="button" className="btn-ghost flex-1" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="button" className="btn-gold flex-1" onClick={(e) => {
            const fields = e.currentTarget.form!.querySelectorAll<HTMLInputElement>(`section:nth-of-type(${step + 1}) input`);
            if ([...fields].every((f) => f.reportValidity())) setStep(step + 1);
          }}>{step === 2 || step === 3 ? "Next (or skip)" : "Next"}</button>
        </div>
      )}
      {step === last && <button type="button" className="text-sm text-muted underline" onClick={() => setStep(last - 1)}>Back</button>}
    </form>
  );
}
