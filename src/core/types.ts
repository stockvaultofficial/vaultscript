export type VaultPrimitive = string | number | boolean;

export interface VaultAsset {
  symbol: string;
  properties: Record<string, VaultPrimitive>;
}

export interface VaultProgram {
  variables: Record<string, VaultPrimitive>;
  assets: VaultAsset[];
  prints: string[];
}

export interface VaultManifest {
  vaultscript: string;
  generatedAt: string;
  assets: Array<Record<string, VaultPrimitive>>;
}