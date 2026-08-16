import { normalize } from "viem/ens";
import { errorMessageFromCause } from "./errors.js";

const MIN_ETH_LABEL_LENGTH = 3;

export interface RawCandidate {
  lineNumber: number;
  originalInput: string;
}

export interface ReadyCandidate {
  kind: "ready";
  originalInput: string;
  normalizedLabel: string;
  fullName: string;
}

export interface InvalidCandidate {
  kind: "invalid";
  originalInput: string;
  errorMessage: string;
}

export type PreparedCandidate = ReadyCandidate | InvalidCandidate;

export function parseNamesFile(content: string): RawCandidate[] {
  return content
    .split(/\r?\n/)
    .map((line, index) => {
      const originalInput = line.split("#")[0]?.trim() ?? "";

      if (originalInput.length === 0) {
        return null;
      }

      return {
        lineNumber: index + 1,
        originalInput,
      };
    })
    .filter((candidate): candidate is RawCandidate => candidate !== null);
}

export function normalizeCandidate(input: string): ReadyCandidate | InvalidCandidate {
  const originalInput = input.trim();

  if (originalInput.length === 0) {
    return invalid(originalInput, "Name is empty");
  }

  const stripped = stripEthSuffix(originalInput);
  if (!stripped.ok) {
    return invalid(originalInput, stripped.errorMessage);
  }

  try {
    const normalizedLabel = normalize(stripped.label);

    if (normalizedLabel.length === 0) {
      return invalid(originalInput, "Normalized label is empty");
    }

    if (normalizedLabel.includes(".")) {
      return invalid(originalInput, "Subnames are not supported in v1");
    }

    if (Array.from(normalizedLabel).length < MIN_ETH_LABEL_LENGTH) {
      return invalid(originalInput, ".eth labels must be at least 3 characters");
    }

    return {
      kind: "ready",
      originalInput,
      normalizedLabel,
      fullName: `${normalizedLabel}.eth`,
    };
  } catch (cause) {
    return invalid(originalInput, `ENS normalization failed: ${errorMessageFromCause(cause)}`);
  }
}

export function prepareCandidates(candidates: RawCandidate[]): PreparedCandidate[] {
  const seenLabels = new Set<string>();
  const prepared: PreparedCandidate[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate.originalInput);

    if (normalized.kind === "invalid") {
      prepared.push(normalized);
      continue;
    }

    if (seenLabels.has(normalized.normalizedLabel)) {
      continue;
    }

    seenLabels.add(normalized.normalizedLabel);
    prepared.push(normalized);
  }

  return prepared;
}

function stripEthSuffix(input: string):
  | { ok: true; label: string }
  | { ok: false; errorMessage: string } {
  const parts = input.split(".");

  if (parts.length === 1) {
    return { ok: true, label: input };
  }

  if (parts.length === 2 && parts[1]?.toLowerCase() === "eth") {
    if ((parts[0] ?? "").length === 0) {
      return { ok: false, errorMessage: "Missing label before .eth" };
    }

    return { ok: true, label: parts[0] ?? "" };
  }

  if (input.toLowerCase().endsWith(".eth")) {
    return { ok: false, errorMessage: "Subnames are not supported in v1" };
  }

  return {
    ok: false,
    errorMessage: "Only bare labels and .eth names are supported",
  };
}

function invalid(originalInput: string, errorMessage: string): InvalidCandidate {
  return {
    kind: "invalid",
    originalInput,
    errorMessage,
  };
}
