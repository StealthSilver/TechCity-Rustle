export type OfferLetterValues = {
  candidateName: string;
  subject: string;
  collegeName: string;
  startDate: string;
  duration: string;
  lastDate: string;
  salaryAmount: string;
};

export const emptyOfferLetter: OfferLetterValues = {
  candidateName: "",
  subject: "",
  collegeName: "",
  startDate: "",
  duration: "",
  lastDate: "",
  salaryAmount: "",
};

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(value: number) {
  if (value < 20) return ones[value];
  const ten = tens[Math.floor(value / 10)];
  const one = value % 10;
  return one ? `${ten}-${ones[one]}` : ten;
}

function threeDigitWords(value: number) {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) parts.push(twoDigitWords(rest));
  if (hundred && rest) return `${parts[0]} and ${parts[1]}`;
  return parts.join(" ");
}

function integerInWords(value: number): string {
  if (value < 1000) return threeDigitWords(value);

  const scales = [
    { value: 10000000, name: "Crore" },
    { value: 100000, name: "Lakh" },
    { value: 1000, name: "Thousand" },
  ];
  const parts: string[] = [];
  let remaining = value;

  for (const scale of scales) {
    const count = Math.floor(remaining / scale.value);
    if (count) {
      parts.push(`${integerInWords(count)} ${scale.name}`);
      remaining %= scale.value;
    }
  }

  if (remaining) parts.push(threeDigitWords(remaining));
  return parts.join(" ");
}

export function amountInWords(amount: string) {
  const digits = amount.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";

  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return "";
  if (value === 0) return "Zero";
  return integerInWords(value);
}

export function formatSalaryAmount(amount: string) {
  const digits = amount.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`;
}

export type TextWeight = "regular" | "bold" | "rupee";

export type TextRun = {
  text: string;
  weight: TextWeight;
};

export type LetterBlock = {
  runs: TextRun[];
  spaceAfter: boolean;
};

function daySuffix(day: number) {
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) return "th";
  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";
  return "th";
}

export function formatOfferDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
  return `${String(day).padStart(2, "0")}${daySuffix(day)} ${monthName} ${year}`;
}

function filled(value: string, placeholder: string, weight: TextWeight): TextRun {
  const text = value.trim();
  return text ? { text, weight } : { text: placeholder, weight: "regular" };
}

export function salaryLine(amount: string) {
  const cleanAmount = formatSalaryAmount(amount);
  const words = amountInWords(cleanAmount);
  if (!cleanAmount || !words) return "";
  return `₹${cleanAmount}/- (Rupees ${words} Only) per month`;
}

export function offerLetterBlocks(values: OfferLetterValues): LetterBlock[] {
  const name = filled(values.candidateName, "Candidate name", "bold");
  const subject = filled(values.subject, "Subject", "bold");
  const collegeBold = filled(values.collegeName, "College name", "bold");
  const college = filled(values.collegeName, "College name", "regular");
  const start = filled(formatOfferDate(values.startDate), "Start date", "bold");
  const duration = filled(values.duration, "Duration", "regular");
  const lastDate = filled(formatOfferDate(values.lastDate), "Last date", "bold");
  const salary = salaryLine(values.salaryAmount);

  const salaryRuns: TextRun[] = salary
    ? [
        { text: "₹", weight: "rupee" },
        { text: salary.slice(1), weight: "bold" },
      ]
    : [{ text: "Salary", weight: "regular" }];

  return [
    {
      runs: [{ text: "Dear ", weight: "regular" }, name, { text: ",", weight: "regular" }],
      spaceAfter: true,
    },
    {
      runs: [{ text: "Subject: ", weight: "bold" }, subject],
      spaceAfter: true,
    },
    {
      runs: [
        { text: "TechCity Skills Pvt. Ltd.", weight: "bold" },
        {
          text: " is pleased to offer you the engagement as a Technical Trainer for conducting training at ",
          weight: "regular",
        },
        collegeBold,
        { text: ".", weight: "regular" },
      ],
      spaceAfter: false,
    },
    {
      runs: [
        {
          text: "You will be responsible for delivering the assigned training sessions, covering the prescribed technical curriculum, conducting interactive sessions, practical activities, and providing appropriate guidance to the participating students.",
          weight: "regular",
        },
      ],
      spaceAfter: true,
    },
    {
      runs: [
        { text: "The workshop is scheduled to commence on ", weight: "regular" },
        start,
        { text: " and will be conducted for a period of ", weight: "regular" },
        duration,
        { text: ", with the ", weight: "regular" },
        { text: "tentative last date being ", weight: "bold" },
        lastDate,
        {
          text: ", as per the training schedule finalized by TechCity Skills Pvt. Ltd. and ",
          weight: "regular",
        },
        college,
        {
          text: ". The said last date is tentative and may be revised based on the finalized training schedule.",
          weight: "regular",
        },
      ],
      spaceAfter: true,
    },
    {
      runs: [
        {
          text: "For the successful completion of the assigned workshop, you will be paid a professional fee of:",
          weight: "regular",
        },
      ],
      spaceAfter: false,
    },
    { runs: salaryRuns, spaceAfter: false },
    {
      runs: [
        {
          text: "The payment shall be processed as per the agreed payment process of TechCity Skills Pvt. Ltd., subject to applicable statutory deductions, if any.",
          weight: "regular",
        },
      ],
      spaceAfter: false,
    },
    {
      runs: [
        {
          text: "We expect you to maintain professional standards, punctuality, and effective communication throughout the training assignment and to coordinate with the designated representatives of TechCity Skills Pvt. Ltd. and ",
          weight: "regular",
        },
        collegeBold,
        { text: " for the smooth execution of the workshop.", weight: "regular" },
      ],
      spaceAfter: false,
    },
    {
      runs: [
        {
          text: "The detailed Terms & Conditions of the engagement will be provided separately and shall form part of the overall trainer engagement.",
          weight: "regular",
        },
      ],
      spaceAfter: false,
    },
    {
      runs: [
        {
          text: "We look forward to your contribution toward the successful delivery of the training at ",
          weight: "regular",
        },
        college,
        { text: ".", weight: "regular" },
      ],
      spaceAfter: false,
    },
    {
      runs: [
        {
          text: "We wish you a successful and productive engagement with ",
          weight: "regular",
        },
        { text: "TechCity Skills Pvt. Ltd.", weight: "bold" },
      ],
      spaceAfter: false,
    },
  ];
}

export function isOfferLetterComplete(values: OfferLetterValues) {
  return offerLetterBlocks(values).every((block) =>
    block.runs.every((run) => run.weight !== "regular" || !isPlaceholder(run.text)),
  );
}

const placeholders = new Set([
  "Candidate name",
  "Subject",
  "College name",
  "Start date",
  "Duration",
  "Last date",
  "Salary",
]);

function isPlaceholder(text: string) {
  return placeholders.has(text);
}

export function offerLetterFileName(candidateName: string) {
  const slug = candidateName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `TechCity-Offer-Letter${slug ? `-${slug}` : ""}.pdf`;
}
