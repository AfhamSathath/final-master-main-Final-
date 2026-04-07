export const QUALIFICATION_CATEGORIES = [
  "Information Technology",
  "Business & Management",
  "Engineering",
  "Digital Marketing",
  "Healthcare",
] as const;

export type QualificationCategory = (typeof QUALIFICATION_CATEGORIES)[number];

export const QUALIFICATION_OPTIONS = [
  "G.C.E. A/L",
  "NVQ Level 3",
  "NVQ Level 4",
  "NVQ Level 5 (Diploma)",
  "NVQ Level 6 (Higher Diploma)",
  "NVQ Level 7 (Bachelor's Degree)",
  "Certificate",
  "Diploma",
  "Higher Diploma",
  "HND (Higher National Diploma)",
  "Bachelor's Degree",
  "Postgraduate Diploma",
  "Master's Degree",
  "PhD / Doctorate",
  "Professional Qualification (CIM, CIMA, ACCA, etc.)",
  "Others",
];

export const QUALIFICATION_SUBOPTIONS: Record<(typeof QUALIFICATION_CATEGORIES)[number], string[]> = {
  "Information Technology": [
    "All Information Technology Qualifications",
    "Bachelor's Degree in IT",
    "Master's Degree in IT",
    "Diploma in IT",
    "Higher Diploma in IT",
    "NVQ Level 6 (Higher Diploma) in IT",
    "NVQ Level 7 (Bachelor's Degree) in IT",
    "Certificate in IT",
    "Professional Qualification (CIM, CIMA, ACCA, etc.) in IT",
    "Others",
  ],
  "Business & Management": [
    "All Business & Management Qualifications",
    "Bachelor's Degree in Business",
    "Master's Degree in Business",
    "Diploma in Business",
    "Higher Diploma in Business",
    "Certificate in Business",
    "Professional Qualification (CIM, CIMA, ACCA, etc.)",
    "Others",
  ],
  "Engineering": [
    "All Engineering Qualifications",
    "Bachelor's Degree in Engineering",
    "Master's Degree in Engineering",
    "Diploma in Engineering",
    "Higher Diploma in Engineering",
    "Certificate in Engineering",
    "Professional Qualification in Engineering",
    "Others",
  ],
  "Digital Marketing": [
    "All Digital Marketing Qualifications",
    "Bachelor's Degree in Digital Marketing",
    "Master's Degree in Digital Marketing",
    "Diploma in Digital Marketing",
    "Higher Diploma in Digital Marketing",
    "Certificate in Digital Marketing",
    "Professional Qualification in Digital Marketing",
    "Others",
  ],
  "Healthcare": [
    "All Healthcare Qualifications",
    "Bachelor's Degree in Healthcare",
    "Master's Degree in Healthcare",
    "Diploma in Healthcare",
    "Higher Diploma in Healthcare",
    "Certificate in Healthcare",
    "Professional Qualification in Healthcare",
    "Others",
  ],
};

export const ALL_QUALIFICATION_OPTIONS = Array.from(
  new Set([
    ...QUALIFICATION_OPTIONS,
    ...Object.values(QUALIFICATION_SUBOPTIONS).flat(),
  ])
);
