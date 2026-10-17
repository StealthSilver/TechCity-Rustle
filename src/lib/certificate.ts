export const certificateTemplates = [
  { id: "old", label: "Old template" },
  { id: "new", label: "New template" },
] as const;

export type CertificateTemplate = (typeof certificateTemplates)[number]["id"];

export type CertificateValues = {
  candidateName: string;
  trainingName: string;
  certificateUrl: string;
};

export const defaultTrainingName = "AI Tools and Prompt Engineering Workshop";

export const emptyCertificate: CertificateValues = {
  candidateName: "",
  trainingName: defaultTrainingName,
  certificateUrl: "",
};

export const sentenceBefore = "for successfully completing the ";
export const sentenceAfter = " with outstanding performance and active participation.";

export function certificateTraining(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isCertificateComplete(values: CertificateValues, template: CertificateTemplate) {
  const filled =
    values.candidateName.trim().length > 0 && certificateTraining(values.trainingName).length > 0;
  const link = values.certificateUrl.trim();
  if (template === "new" && link && !isHttpUrl(link)) return false;
  return filled;
}

export function certificateFileName(candidateName: string) {
  const slug = candidateName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `TechCity-Certificate${slug ? `-${slug}` : ""}.pdf`;
}
