import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const inputFiles = process.argv.slice(2);
const files = inputFiles.length
  ? inputFiles
  : ["telugu_leads.csv", "hindi_leads.csv", "international_leads.csv"];
const outputPath = resolve("outreach/combined_discovery.csv");
const priorityOutputPath = resolve("outreach/priority_invitation_queue.csv");

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phoneCandidatePattern = /(?:\+?\d[\d .()-]{8,}\d)/g;

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((value) => value.some(Boolean));
}

function asObjects(rows) {
  if (!rows.length) return [];
  const [headers, ...values] = rows;
  return values.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function first(record, keys) {
  for (const key of keys) {
    if (record[key]?.trim()) return record[key].trim();
  }
  return "";
}

function normalizeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["feature", "si", "ref"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return value.trim();
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function priorityFor(record) {
  const text = [
    first(record, ["name", "channel_name", "group_name", "organization_name", "org_name"]),
    first(record, ["topic", "focus"]),
    first(record, ["personalization_note", "relevance_note"]),
  ].join(" ").toLowerCase();
  if (/\b(?:organic|natural farming|regenerative|agroecolog\w*|permaculture|biodynamic|ecological farming|soil health)\b/.test(text)) {
    return { tier: "1_natural_organic", reason: "Natural, organic, regenerative, or agroecological focus" };
  }
  if (/\b(?:sustainab\w*|smallholder\w*|family farm\w*|peasant\w*|forest and farm|conservation|climate-smart)\b/.test(text)) {
    return { tier: "2_sustainable_smallholder", reason: "Sustainable or smallholder farming focus" };
  }
  return { tier: "3_general_farming", reason: "General farming relevance" };
}

const normalized = [];
const errors = [];

for (const file of files) {
  const inputPath = resolve("outreach", file);
  let raw;
  try {
    raw = await readFile(inputPath, "utf8");
  } catch (error) {
    errors.push(`${basename(inputPath)}: ${error.code ?? error.message}`);
    continue;
  }

  for (const [index, record] of asObjects(parseCsv(raw)).entries()) {
    const serialized = Object.values(record).join(" ");
    const containsPhone = [...serialized.matchAll(phoneCandidatePattern)].some(
      ([candidate]) => candidate.replaceAll(/\D/g, "").length >= 10,
    );
    if (emailPattern.test(serialized) || containsPhone) {
      errors.push(`${basename(inputPath)} row ${index + 2}: contains a contact value`);
      continue;
    }

    const name = first(record, ["name", "channel_name", "group_name", "organization_name", "org_name"]);
    const canonicalUrl = normalizeUrl(first(record, ["canonical_url", "channel_url", "official_url", "organization_url", "group_url"]));
    const evidenceUrl = normalizeUrl(first(record, ["evidence_url", "activity_evidence_url", "recent_evidence_url", "relevance_evidence_url"]));
    const contactPageUrl = normalizeUrl(first(record, ["official_contact_page_url", "partnership_page_url", "contact_page_url"]));
    if (
      !name ||
      !isHttpUrl(canonicalUrl) ||
      !isHttpUrl(evidenceUrl) ||
      (contactPageUrl && !isHttpUrl(contactPageUrl))
    ) {
      errors.push(`${basename(inputPath)} row ${index + 2}: missing name, canonical URL, or evidence URL`);
      continue;
    }

    const priority = priorityFor(record);
    normalized.push({
      name,
      canonical_url: canonicalUrl,
      priority_tier: priority.tier,
      priority_reason: priority.reason,
      language: first(record, ["language"]),
      country: first(record, ["country"]),
      lead_type: first(record, ["lead_type", "type"]) || "youtube_creator",
      audience_size: first(record, ["audience_size", "subscribers", "members"]),
      last_active: first(record, ["last_active", "evidence_date", "activity_date"]),
      evidence_url: evidenceUrl,
      topic: first(record, ["topic", "focus"]),
      personalization_note: first(record, ["personalization_note", "relevance_note"]),
      official_contact_page_url: contactPageUrl,
      source_file: basename(inputPath),
      verification_status: first(record, ["verification_status"]) || "source_reviewed",
    });
  }
}

const deduplicated = [...new Map(normalized.map((row) => [row.canonical_url.toLowerCase(), row])).values()]
  .sort((left, right) => left.priority_tier.localeCompare(right.priority_tier) || left.language.localeCompare(right.language) || left.country.localeCompare(right.country) || left.name.localeCompare(right.name));

const columns = [
  "name",
  "canonical_url",
  "priority_tier",
  "priority_reason",
  "language",
  "country",
  "lead_type",
  "audience_size",
  "last_active",
  "evidence_url",
  "topic",
  "personalization_note",
  "official_contact_page_url",
  "source_file",
  "verification_status",
];
const csv = [columns.join(","), ...deduplicated.map((row) => columns.map((column) => escapeCsv(row[column])).join(","))].join("\n") + "\n";
await writeFile(outputPath, csv, "utf8");

const priorityColumns = [...columns, "delivery_status", "eligibility_reason"];
const priorityRows = deduplicated
  .filter((row) => row.priority_tier !== "3_general_farming")
  .map((row) => ({
    ...row,
    delivery_status: "awaiting_verified_consent",
    eligibility_reason: "No current channel- and purpose-specific consent receipt",
  }));
const priorityCsv = [
  priorityColumns.join(","),
  ...priorityRows.map((row) => priorityColumns.map((column) => escapeCsv(row[column])).join(",")),
].join("\n") + "\n";
await writeFile(priorityOutputPath, priorityCsv, "utf8");

const countBy = (key) => Object.fromEntries(
  [...deduplicated.reduce((counts, row) => {
    const value = row[key] || "unspecified";
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);

process.stdout.write(`${JSON.stringify({
  inputs: files.length,
  accepted: normalized.length,
  unique: deduplicated.length,
  countries_or_regions: new Set(deduplicated.map((row) => row.country).filter(Boolean)).size,
  by_source: countBy("source_file"),
  by_type: countBy("lead_type"),
  by_priority: countBy("priority_tier"),
  priority_queue: priorityRows.length,
  rejected: errors.length,
  errors,
}, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
