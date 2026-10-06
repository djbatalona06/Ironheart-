"""Generates supabase/seed_templates.sql. Every exercise name must exist in seed.sql.
Generic names only: these are commonly documented training *structures*, not copied programs."""
import json, re

def d(name, *ex): return {"name": name, "exercises": [dict(zip(("name","sets","reps","pct_1rm"), e)) for e in ex]}

push = d("Push", ("Barbell Bench Press",4,"6-8"),("Overhead Press",3,"8-10"),("Incline Dumbbell Press",3,"10"),("Lateral Raise",3,"15"),("Tricep Pushdown",3,"12"),("Overhead Tricep Extension",3,"12"))
pull = d("Pull", ("Deadlift",3,"5"),("Pull-Up",3,"8"),("Barbell Row",3,"8"),("Face Pull",3,"15"),("Barbell Curl",3,"10"),("Hammer Curl",3,"12"))
legs = d("Legs", ("Back Squat",4,"6-8"),("Romanian Deadlift",3,"8"),("Leg Press",3,"10"),("Lying Leg Curl",3,"12"),("Standing Calf Raise",4,"12"),("Hanging Leg Raise",3,"12"))
a5 = d("Workout A", ("Back Squat",5,"5"),("Barbell Bench Press",5,"5"),("Barbell Row",5,"5"))
b5 = d("Workout B", ("Back Squat",5,"5"),("Overhead Press",5,"5"),("Deadlift",1,"5"))
na = d("Workout A", ("Back Squat",3,"5"),("Barbell Bench Press",3,"5"),("Deadlift",1,"5"))
nb = d("Workout B", ("Back Squat",3,"5"),("Overhead Press",3,"5"),("Power Clean",5,"3"))
up = d("Upper Power", ("Barbell Bench Press",4,"3-5"),("Barbell Row",4,"3-5"),("Overhead Press",3,"6"),("Pull-Up",3,"6"),("Skull Crusher",2,"8"),("Barbell Curl",2,"8"))
lp = d("Lower Power", ("Back Squat",4,"3-5"),("Deadlift",3,"3-5"),("Leg Press",3,"10"),("Lying Leg Curl",3,"8"),("Standing Calf Raise",4,"8"))
uh = d("Upper Hypertrophy", ("Incline Dumbbell Press",4,"10"),("Cable Fly",3,"12"),("Seated Cable Row",4,"10"),("Lateral Raise",3,"15"),("Dumbbell Curl",3,"12"),("Tricep Pushdown",3,"12"))
lh = d("Lower Hypertrophy", ("Front Squat",3,"10"),("Bulgarian Split Squat",3,"10"),("Seated Leg Curl",3,"12"),("Leg Extension",3,"15"),("Seated Calf Raise",4,"15"))
ua = d("Upper A", ("Barbell Bench Press",4,"6"),("Barbell Row",4,"6"),("Overhead Press",3,"8"),("Lat Pulldown",3,"10"),("Dumbbell Curl",2,"12"),("Tricep Pushdown",2,"12"))
la = d("Lower A", ("Back Squat",4,"6"),("Romanian Deadlift",3,"8"),("Walking Lunge",3,"10"),("Standing Calf Raise",4,"12"),("Hanging Leg Raise",3,"12"))
ub = d("Upper B", ("Incline Barbell Bench Press",4,"8"),("Pull-Up",4,"8"),("Seated Dumbbell Press",3,"10"),("Seated Cable Row",3,"10"),("Hammer Curl",2,"12"),("Skull Crusher",2,"12"))
lb = d("Lower B", ("Deadlift",3,"5"),("Front Squat",3,"8"),("Lying Leg Curl",3,"10"),("Hip Thrust",3,"10"),("Seated Calf Raise",4,"15"))
fa = d("Full Body A", ("Back Squat",3,"8"),("Barbell Bench Press",3,"8"),("Barbell Row",3,"8"),("Lateral Raise",2,"15"),("Cable Crunch",3,"12"))
fb = d("Full Body B", ("Deadlift",3,"5"),("Overhead Press",3,"8"),("Lat Pulldown",3,"10"),("Walking Lunge",2,"10"),("Hanging Leg Raise",3,"12"))
fc = d("Full Body C", ("Front Squat",3,"8"),("Incline Dumbbell Press",3,"10"),("Seated Cable Row",3,"10"),("Romanian Deadlift",3,"10"),("Dumbbell Curl",2,"12"))
cb = d("Chest & Back", ("Barbell Bench Press",4,"8"),("Incline Dumbbell Press",3,"10"),("Dumbbell Fly",3,"12"),("Pull-Up",4,"8"),("Barbell Row",4,"8"),("Lat Pulldown",3,"10"))
sa = d("Shoulders & Arms", ("Overhead Press",4,"8"),("Lateral Raise",4,"12"),("Rear Delt Fly",3,"15"),("Barbell Curl",3,"10"),("Skull Crusher",3,"10"),("Hammer Curl",3,"12"),("Tricep Pushdown",3,"12"))
bl = d("Legs", ("Back Squat",4,"8"),("Leg Press",3,"12"),("Romanian Deadlift",3,"10"),("Leg Extension",3,"15"),("Lying Leg Curl",3,"12"),("Standing Calf Raise",4,"15"))
w1 = d("Press Day", ("Overhead Press",3,"5",75),("Chest Dip",5,"10"),("Chin-Up",5,"10"))
w2 = d("Deadlift Day", ("Deadlift",3,"5",75),("Good Morning",5,"10"),("Hanging Leg Raise",5,"15"))
w3 = d("Bench Day", ("Barbell Bench Press",3,"5",75),("Dumbbell Bench Press",5,"10"),("One-Arm Dumbbell Row",5,"10"))
w4 = d("Squat Day", ("Back Squat",3,"5",75),("Leg Press",5,"10"),("Lying Leg Curl",5,"10"))
t1 = d("Day 1", ("Back Squat",5,"3"),("Barbell Bench Press",3,"10"),("Lat Pulldown",3,"15"))
t2 = d("Day 2", ("Overhead Press",5,"3"),("Deadlift",3,"10"),("One-Arm Dumbbell Row",3,"15"))
t3 = d("Day 3", ("Barbell Bench Press",5,"3"),("Back Squat",3,"10"),("Lat Pulldown",3,"15"))
hp = d("Push", ("Barbell Bench Press",3,"5"),("Overhead Press",3,"8"),("Incline Dumbbell Press",3,"10"),("Tricep Pushdown",3,"10"),("Lateral Raise",3,"15"))
hl = d("Pull", ("Deadlift",1,"5"),("Barbell Row",3,"5"),("Pull-Up",3,"8"),("Face Pull",5,"15"),("Hammer Curl",4,"10"))
hg = d("Legs", ("Back Squat",3,"5"),("Romanian Deadlift",3,"10"),("Leg Press",3,"10"),("Lying Leg Curl",3,"10"),("Standing Calf Raise",5,"10"))

T = [
 ("ppl-6","Push / Pull / Legs",6,"Each muscle group twice a week across push, pull and leg days. Intermediate volume.",[push,pull,legs,push,pull,legs]),
 ("linear-5x5","5×5 Linear Progression",3,"Three compound lifts per session for 5 sets of 5, adding weight every session.",[a5,b5,a5]),
 ("novice-linear-3","3-Day Novice Linear",3,"Low-volume barbell basics for 3 sets of 5. Add weight each session while you can.",[na,nb,na]),
 ("power-hyper-ul","Power-Hypertrophy Upper/Lower",4,"Two heavy low-rep days and two higher-rep size days.",[up,lp,uh,lh]),
 ("upper-lower-4","Upper / Lower",4,"Balanced 4-day split hitting everything twice a week.",[ua,la,ub,lb]),
 ("full-body-3","Full Body 3×",3,"Three full-body sessions with rotating main lifts. Great for busy weeks.",[fa,fb,fc]),
 ("classic-bro-6","Classic Bodybuilding Split",6,"Body-part days run twice a week: chest & back, shoulders & arms, legs.",[cb,sa,bl,cb,sa,bl]),
 ("wave-531-4","5/3/1-Style Wave",4,"One main lift per day on a monthly percentage wave (week 1 shown at 75% of training max) plus assistance.",[w1,w2,w3,w4]),
 ("tiered-t1t2t3","Tiered T1/T2/T3 Progression",3,"Heavy tier-1 lift, moderate tier-2, light high-rep tier-3 each day.",[t1,t2,t3]),
 ("high-freq-ppl","High-Frequency PPL (beginner)",6,"Beginner push/pull/legs run twice a week with simple linear progression.",[hp,hl,hg,hp,hl,hg]),
]

seed = open("supabase/seed.sql").read()
known = set(re.findall(r"\('((?:[^']|'')+)','[a-z_]+','[a-z]+'\)", seed))
known = {k.replace("''", "'") for k in known}
for _, _, _, _, days in T:
    for day in days:
        for e in day["exercises"]:
            assert e["name"] in known, f"unknown exercise {e['name']}"
            if e.get("pct_1rm") is None: e.pop("pct_1rm", None)

q = lambda s: "'" + s.replace("'", "''") + "'"
rows = ",\n".join(f"  ({q(s)}, {q(n)}, {dpw}, {q(desc)}, 'Structure based on commonly documented training splits.', {q(json.dumps(days))}::jsonb)" for s, n, dpw, desc, days in T)
open("supabase/seed_templates.sql", "w").write(
  "-- Generated by scripts/templates.py. Do not edit by hand.\n"
  "insert into public.workout_templates (slug, name, days_per_week, description, source_note, days) values\n"
  + rows + "\non conflict (slug) do update set name = excluded.name, days_per_week = excluded.days_per_week,\n"
  "  description = excluded.description, days = excluded.days;\n")
print("ok", len(T), "templates")
