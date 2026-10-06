# Project Brief: IRONHEART

## One-liner
A partner-accountability fitness PWA: pair with a partner, set a weekly workout
goal and a stake ("buy dinner"), and watch a shared color-coded weekly calendar
fill in. Whoever misses their goal owes the stake. Workout logging, a template
program generator, photo check-ins, nutrition tracking, challenges and virtual
gifts all feed that loop. Black-and-gold, gym-hardcore aesthetic. Installs on
iOS without the App Store.

> Product loop inspired by partner-fitness apps such as Sweatmates. Inspired-by
> only: do not copy any other app's name, copy, UI layouts, or assets.

## Target User
- 18–40, gym-goer, owns an iPhone
- Trains 3–6x/week with a partner: significant other, friend, or training buddy
- Wants accountability more than analytics, but still logs real lifts

## Core Loop (the reason the app exists)
1. Pair with a partner (invite by @handle)
2. Each partner sets a weekly goal (1–7 workout days) and a stake
3. Log workouts during the week (photo check-in optional = "verified")
4. Both see the shared weekly calendar update live
5. Monday auto-close: whoever missed owes the stake → ledger
6. Hit together → streak grows

## Core MVP Features (Ship These)
1. **Auth**: Supabase Auth with email magic link, Google, GitHub
2. **Weekly Partner Pacts**: pairing, weekly goals + stakes, color-coded weekly
   calendar, auto weekly close, stake ledger, streaks
3. **Workout Logger**: create, log, view workouts (sets, reps, weight, RPE),
   offline-capable
4. **Workout Generator**: template library of publicly documented program
   structures + OpenAI bot that formats/exports programs as .docx/.xlsx
5. **Camera**: progress photos + 15s form clips, manual captions, optional
   photo check-in on a workout
6. **Challenges + Gifts**: metric challenges (count, volume, streak, macro hit),
   points, virtual gifts, in-app notifications
7. **Nutrition Tracking**: calorie/macro logging with macro rings
8. **PWA Install**: Add to Home Screen on iOS, offline logging

## Out of Scope for MVP
- Real-money wagers or payments (legal review required)
- Auto-captions (Whisper): post-MVP
- Live video streaming
- Group pacts (3+ people); pacts are 1:1, but a user can have several
- Public social feed
- AI-generated programs from scratch (templates only; bot formats/exports)
- Android-specific polish (PWA covers it)

## Success Criteria
- Two users can pair, set goals, log during the week, and the Monday close
  creates the correct ledger entry
- Weekly calendar shows correct colors for both partners in real time
- User can log a workout offline and it syncs when online
- User can generate a PPL program from a template and export it as .docx
- User can capture a 15s form clip and add a caption
- User can log a meal and see daily macros
- UI feels black, gold, bold, aggressive
- App installs to the iOS home screen and opens standalone
