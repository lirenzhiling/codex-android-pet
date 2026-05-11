import {pick} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {PetConfig} from '../types';

const IMPORTED_PETS_DIR = RNFS.DocumentDirectoryPath + '/imported_pets';

const DEFAULT_ANIMATIONS = {
  idle: {row: 0, frames: 6, fps: 6, frameHeight: 212},
  dragRight: {row: 1, frames: 8, fps: 8, frameHeight: 204},
  dragLeft: {row: 2, frames: 8, fps: 8, frameHeight: 209},
  idle2: {row: 3, frames: 4, fps: 6, frameHeight: 212},
  idle3: {row: 4, frames: 5, fps: 6, frameHeight: 207},
  idle4: {row: 5, frames: 8, fps: 6, frameHeight: 206},
  idle5: {row: 6, frames: 6, fps: 6, frameHeight: 209},
  idle6: {row: 7, frames: 6, fps: 6, frameHeight: 207},
  idle7: {row: 8, frames: 6, fps: 6, frameHeight: 206},
};

async function ensureImportDir(): Promise<void> {
  const exists = await RNFS.exists(IMPORTED_PETS_DIR);
  if (!exists) {
    await RNFS.mkdir(IMPORTED_PETS_DIR);
  }
}

export async function importPetWebp(): Promise<{
  config: PetConfig;
  path: string;
} | null> {
  try {
    const [result] = await pick({
      type: ['image/webp', 'image/*'],
    });

    if (!result?.uri) return null;

    const petId = `pet_${Date.now()}`;
    await ensureImportDir();
    const petDir = `${IMPORTED_PETS_DIR}/${petId}`;
    await RNFS.mkdir(petDir);

    const srcPath = result.uri.replace('file://', '').replace('content://', '');

    if (result.uri.startsWith('content://')) {
      await RNFS.copyFile(result.uri, `${petDir}/spritesheet.webp`);
    } else {
      await RNFS.copyFile(srcPath, `${petDir}/spritesheet.webp`);
    }

    const config: PetConfig = {
      id: petId,
      displayName: '',
      description: 'Codex 桌宠',
      spritesheetPath: 'spritesheet.webp',
      frameWidth: 192,
      columns: 8,
      rows: 9,
      animations: DEFAULT_ANIMATIONS,
    };

    await RNFS.writeFile(
      `${petDir}/pet.json`,
      JSON.stringify(config, null, 2),
      'utf8',
    );

    return {config, path: petDir};
  } catch (e: any) {
    if (e?.code === 'DOCUMENT_PICKER_CANCELED') return null;
    throw e;
  }
}
