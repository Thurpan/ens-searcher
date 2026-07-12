import {
  DEFAULT_DB_PATH,
  DEFAULT_DURATION_DAYS,
  DEFAULT_NAMES_FILE,
} from "./constants.js";

export interface ScanCliOptions {
  filePath: string;
  dbPath: string;
  durationDays: number;
  help: boolean;
}

export interface QueryCliOptions {
  dbPath: string;
  limit: number;
  help: boolean;
}

export function parseScanArgs(args: string[]): ScanCliOptions {
  const options: ScanCliOptions = {
    filePath: DEFAULT_NAMES_FILE,
    dbPath: DEFAULT_DB_PATH,
    durationDays: DEFAULT_DURATION_DAYS,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--file") {
      options.filePath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--file=")) {
      options.filePath = valueAfterEquals(arg);
      continue;
    }

    if (arg === "--db") {
      options.dbPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--db=")) {
      options.dbPath = valueAfterEquals(arg);
      continue;
    }

    if (arg === "--duration-days") {
      options.durationDays = parsePositiveInteger(requireValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--duration-days=")) {
      options.durationDays = parsePositiveInteger(valueAfterEquals(arg), "--duration-days");
      continue;
    }

    throw new Error(`Unknown scan option: ${arg}`);
  }

  return options;
}

export function parseQueryArgs(args: string[]): QueryCliOptions {
  const options: QueryCliOptions = {
    dbPath: DEFAULT_DB_PATH,
    limit: 100,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--db") {
      options.dbPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--db=")) {
      options.dbPath = valueAfterEquals(arg);
      continue;
    }

    if (arg === "--limit") {
      options.limit = parsePositiveInteger(requireValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInteger(valueAfterEquals(arg), "--limit");
      continue;
    }

    throw new Error(`Unknown query option: ${arg}`);
  }

  return options;
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function valueAfterEquals(arg: string): string {
  const value = arg.slice(arg.indexOf("=") + 1);

  if (value.length === 0) {
    throw new Error(`${arg.slice(0, arg.indexOf("="))} requires a value`);
  }

  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return parsed;
}
