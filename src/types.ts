export interface AnimationDef {
  row: number;
  frames: number;
  fps: number;
  frameHeight?: number;
}

export interface PetConfig {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
  frameWidth: number;
  frameHeight?: number;
  columns: number;
  rows: number;
  animations: Record<string, AnimationDef>;
}

export interface Pet {
  id: string;
  configId: string;
  name: string;
  source: 'builtin' | 'imported';
  importedPath?: string;
  createdAt: number;
}

export interface PetWithConfig extends Pet {
  config: PetConfig;
  spritesheetUri: string;
}
