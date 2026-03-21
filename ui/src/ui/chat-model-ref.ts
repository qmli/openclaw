import type { ModelCatalogEntry } from "./types.ts";

export type ChatModelOverride =
  | {
      kind: "qualified";
      value: string;
    }
  | {
      kind: "raw";
      value: string;
    };

export function buildQualifiedChatModelValue(model: string, provider?: string | null): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) {
    return "";
  }
  const trimmedProvider = provider?.trim();
  return trimmedProvider ? `${trimmedProvider}/${trimmedModel}` : trimmedModel;
}

export function createChatModelOverride(value: string): ChatModelOverride | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("/")) {
    return { kind: "qualified", value: trimmed };
  }
  return { kind: "raw", value: trimmed };
}

export function normalizeChatModelOverrideValue(
  override: ChatModelOverride | null | undefined,
  catalog: ModelCatalogEntry[],
): string {
  if (!override) {
    return "";
  }
  const trimmed = override?.value.trim();
  if (!trimmed) {
    return "";
  }
  if (override.kind === "qualified") {
    return trimmed;
  }

  let matchedValue = "";
  for (const entry of catalog) {
    if (entry.id.trim().toLowerCase() !== trimmed.toLowerCase()) {
      continue;
    }
    const candidate = buildQualifiedChatModelValue(entry.id, entry.provider);
    if (!matchedValue) {
      matchedValue = candidate;
      continue;
    }
    if (matchedValue.toLowerCase() !== candidate.toLowerCase()) {
      return trimmed;
    }
  }
  return matchedValue || trimmed;
}

export function resolveServerChatModelValue(
  model?: string | null,
  provider?: string | null,
): string {
  if (typeof model !== "string") {
    return "";
  }
  return buildQualifiedChatModelValue(model, provider);
}

function findCatalogEntryForQualifiedValue(
  value: string,
  catalog: ModelCatalogEntry[],
): ModelCatalogEntry | undefined {
  const key = value.trim().toLowerCase();
  if (!key) {
    return undefined;
  }
  for (const entry of catalog) {
    const qualified = buildQualifiedChatModelValue(entry.id, entry.provider);
    if (qualified.toLowerCase() === key) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Human-readable label for a qualified model ref (`provider/modelId` or bare id).
 * When `catalog` is provided and lists a matching entry with a non-empty `name`, that name is shown instead of the raw model id.
 */
export function formatChatModelDisplay(value: string, catalog?: ModelCatalogEntry[]): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (catalog && catalog.length > 0) {
    const entry = findCatalogEntryForQualifiedValue(trimmed, catalog);
    const friendly = entry?.name?.trim();
    if (entry && friendly) {
      const provider = entry.provider?.trim();
      return provider ? `${friendly} · ${provider}` : friendly;
    }
  }
  const separator = trimmed.indexOf("/");
  if (separator <= 0) {
    return trimmed;
  }
  return `${trimmed.slice(separator + 1)} · ${trimmed.slice(0, separator)}`;
}

export function buildChatModelOption(entry: ModelCatalogEntry): { value: string; label: string } {
  const provider = entry.provider?.trim();
  const displayId = entry.name?.trim() || entry.id;
  return {
    value: buildQualifiedChatModelValue(entry.id, provider),
    label: provider ? `${displayId} · ${provider}` : displayId,
  };
}
