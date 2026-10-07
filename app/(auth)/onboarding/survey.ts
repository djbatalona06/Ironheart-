// Shared by OnboardingForm (client) and actions.ts (server). Lives in its own
// file because a "use server" module may only export async functions.
export const SURVEY_QUESTIONS = [
  {
    key: "days_per_week",
    label: "How many days a week do you want to train?",
    options: [["2", "2 days"], ["3", "3 days"], ["4", "4 days"], ["5", "5 days"], ["6", "6 days"]],
  },
  {
    key: "experience",
    label: "How would you describe your experience?",
    options: [["beginner", "Just starting out"], ["intermediate", "A year or two in"], ["advanced", "Training for years"]],
  },
  {
    key: "obstacle",
    label: "What usually gets in your way?",
    options: [["time", "Finding time"], ["motivation", "Motivation"], ["consistency", "Staying consistent"],
      ["knowledge", "Not knowing what to do"], ["injury", "Injuries"]],
  },
] as const;

export type SurveyKey = (typeof SURVEY_QUESTIONS)[number]["key"];
