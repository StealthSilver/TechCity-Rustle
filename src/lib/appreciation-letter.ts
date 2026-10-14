import { formatOfferDate } from "@/lib/offer-letter";

export type AppreciationLetterValues = {
  letterDate: string;
  trainerName: string;
  role: string;
  institution: string;
  subject: string;
  startDate: string;
  endDate: string;
};

export const emptyAppreciationLetter: AppreciationLetterValues = {
  letterDate: "",
  trainerName: "",
  role: "",
  institution: "",
  subject: "",
  startDate: "",
  endDate: "",
};

export type TextWeight = "light" | "medium" | "bold";

export type TextRun = {
  text: string;
  weight: TextWeight;
};

export type LetterInk = "navy" | "slate";

export type LetterBlock = {
  runs: TextRun[];
  size: number;
  ink: LetterInk;
  spaceAfter: boolean;
};

const BODY_SIZE = 9.8;
const SUBJECT_SIZE = 10.8;

function filled(value: string, placeholder: string, weight: TextWeight): TextRun {
  const text = value.trim();
  return text ? { text, weight } : { text: placeholder, weight: "light" };
}

export function composedSubject(role: string, institution: string) {
  const roleText = role.trim();
  const institutionText = institution.trim();
  if (!roleText || !institutionText) return "";
  return `Appreciation for Your Services as ${roleText} – ${institutionText}`;
}

function subjectText(value: string) {
  return value.trim().replace(/^subject:\s*/i, "");
}

export function appreciationLetterBlocks(values: AppreciationLetterValues): LetterBlock[] {
  const name = filled(values.trainerName, "Trainer name", "bold");
  const role = filled(values.role, "Role", "light");
  const institution = filled(values.institution, "Institution", "bold");
  const start = filled(formatOfferDate(values.startDate), "Start date", "bold");
  const end = filled(formatOfferDate(values.endDate), "End date", "bold");
  const subject = filled(subjectText(values.subject), "Subject", "medium");

  return [
    {
      runs: [{ text: "Dear ", weight: "light" }, name, { text: ",", weight: "light" }],
      size: BODY_SIZE,
      ink: "slate",
      spaceAfter: true,
    },
    {
      runs: [{ text: "Subject: ", weight: "medium" }, subject],
      size: SUBJECT_SIZE,
      ink: "navy",
      spaceAfter: true,
    },
    {
      runs: [
        { text: "TechCity Skills Pvt. Ltd.", weight: "bold" },
        {
          text: " sincerely appreciates your valuable contribution as a ",
          weight: "light",
        },
        role,
        { text: " for the training conducted at ", weight: "light" },
        institution,
        { text: " from ", weight: "light" },
        start,
        { text: " to ", weight: "light" },
        end,
        { text: ".", weight: "light" },
      ],
      size: BODY_SIZE,
      ink: "slate",
      spaceAfter: true,
    },
    {
      runs: [
        {
          text: "Throughout the engagement, you delivered the prescribed technical curriculum with clarity and depth, conducted interactive sessions and practical activities, and guided the participating students with dedication and patience.",
          weight: "light",
        },
      ],
      size: BODY_SIZE,
      ink: "slate",
      spaceAfter: true,
    },
    {
      runs: [
        {
          text: "Your professionalism, punctuality, and effective coordination with the representatives of ",
          weight: "light",
        },
        { text: "TechCity Skills Pvt. Ltd.", weight: "bold" },
        { text: " and ", weight: "light" },
        institution,
        {
          text: " ensured the smooth execution of the workshop and contributed meaningfully to the learning outcomes of the students.",
          weight: "light",
        },
      ],
      size: BODY_SIZE,
      ink: "slate",
      spaceAfter: true,
    },
    {
      runs: [
        {
          text: "We thank you for your commitment and dedication, and wish you continued success in all your future endeavours. We look forward to the opportunity of working together again.",
          weight: "light",
        },
      ],
      size: BODY_SIZE,
      ink: "slate",
      spaceAfter: false,
    },
  ];
}

const placeholders = new Set([
  "Trainer name",
  "Subject",
  "Role",
  "Institution",
  "Start date",
  "End date",
]);

function isPlaceholder(text: string) {
  return placeholders.has(text);
}

export function isAppreciationLetterComplete(values: AppreciationLetterValues) {
  if (!formatOfferDate(values.letterDate)) return false;
  return appreciationLetterBlocks(values).every((block) =>
    block.runs.every((run) => !isPlaceholder(run.text)),
  );
}

export function appreciationLetterFileName(trainerName: string) {
  const slug = trainerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `TechCity-Appreciation-Letter${slug ? `-${slug}` : ""}.pdf`;
}
