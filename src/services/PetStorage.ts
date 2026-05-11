import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {Pet, PetConfig, PetWithConfig} from '../types';

const PETS_KEY = '@pets';
const SELECTED_PET_KEY = '@selected_pet';

const BUILTIN_PETS_DIR = 'pets';

export async function loadBuiltinConfigs(): Promise<PetConfig[]> {
  const ayatoConfig: PetConfig = require('../../assets/pets/ayato/pet.json');
  return [ayatoConfig];
}

export function getBuiltinSpritesheetUri(configId: string): string {
  const asset = builtinAssets[configId];
  if (asset) {
    const resolved = Image.resolveAssetSource(asset);
    return resolved.uri;
  }
  return '';
}

import {Image} from 'react-native';

const builtinAssets: Record<string, number> = {
  ayato: require('../../assets/pets/ayato/spritesheet.webp'),
};

const builtinNativeAssetPaths: Record<string, string> = {
  ayato: 'pets/ayato/spritesheet.webp',
};

export async function getAllPets(): Promise<Pet[]> {
  const raw = await AsyncStorage.getItem(PETS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function savePets(pets: Pet[]): Promise<void> {
  await AsyncStorage.setItem(PETS_KEY, JSON.stringify(pets));
}

export async function addPet(pet: Pet): Promise<void> {
  const pets = await getAllPets();
  pets.push(pet);
  await savePets(pets);
}

export async function updatePet(id: string, updates: Partial<Pet>): Promise<void> {
  const pets = await getAllPets();
  const idx = pets.findIndex(p => p.id === id);
  if (idx >= 0) {
    pets[idx] = {...pets[idx], ...updates};
    await savePets(pets);
  }
}

export async function deletePet(id: string): Promise<void> {
  const pets = await getAllPets();
  const filtered = pets.filter(p => p.id !== id);
  await savePets(filtered);
  const selected = await getSelectedPetId();
  if (selected === id) {
    await setSelectedPetId(null);
  }
}

export async function getSelectedPetId(): Promise<string | null> {
  return AsyncStorage.getItem(SELECTED_PET_KEY);
}

export async function setSelectedPetId(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(SELECTED_PET_KEY, id);
  } else {
    await AsyncStorage.removeItem(SELECTED_PET_KEY);
  }
}

export async function loadPetConfig(pet: Pet): Promise<PetConfig | null> {
  if (pet.source === 'builtin') {
    const configs = await loadBuiltinConfigs();
    return configs.find(c => c.id === pet.configId) || null;
  }
  if (pet.importedPath) {
    const configPath = `${pet.importedPath}/pet.json`;
    const exists = await RNFS.exists(configPath);
    if (exists) {
      const content = await RNFS.readFile(configPath, 'utf8');
      return JSON.parse(content);
    }
  }
  return null;
}

export function getOverlaySpritesheetUri(pet: Pet): string {
  if (pet.source === 'builtin') {
    return 'asset:///' + (builtinNativeAssetPaths[pet.configId] || '');
  }
  if (pet.importedPath) {
    return 'file://' + pet.importedPath + '/spritesheet.webp';
  }
  return '';
}

export function getSpritesheetUri(pet: Pet): string {
  if (pet.source === 'builtin') {
    return getBuiltinSpritesheetUri(pet.configId);
  }
  if (pet.importedPath) {
    return 'file://' + pet.importedPath + '/spritesheet.webp';
  }
  return '';
}

export async function getPetWithConfig(pet: Pet): Promise<PetWithConfig | null> {
  const config = await loadPetConfig(pet);
  if (!config) return null;
  return {
    ...pet,
    config,
    spritesheetUri: getSpritesheetUri(pet),
  };
}

export async function initDefaultPets(): Promise<void> {
  const pets = await getAllPets();
  if (pets.length === 0) {
    const configs = await loadBuiltinConfigs();
    for (const config of configs) {
      await addPet({
        id: `builtin_${config.id}_${Date.now()}`,
        configId: config.id,
        name: config.displayName,
        source: 'builtin',
        createdAt: Date.now(),
      });
    }
  }
}
