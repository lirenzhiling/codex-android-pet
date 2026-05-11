import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import {PetConfig} from '../types';
import {
  addPet,
  loadBuiltinConfigs,
  getBuiltinSpritesheetUri,
} from '../services/PetStorage';
import {importPetWebp} from '../services/PetImporter';
import SpriteAnimation from '../components/SpriteAnimation';
import {useFocusEffect} from '@react-navigation/native';

export default function AddPetScreen({navigation}: any) {
  const [builtins, setBuiltins] = useState<PetConfig[]>([]);
  const [importedPet, setImportedPet] = useState<{
    config: PetConfig;
    path: string;
  } | null>(null);
  const [petName, setPetName] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const configs = await loadBuiltinConfigs();
        setBuiltins(configs);
      })();
    }, []),
  );

  const handleAddBuiltin = async (config: PetConfig) => {
    await addPet({
      id: `builtin_${config.id}_${Date.now()}`,
      configId: config.id,
      name: config.displayName,
      source: 'builtin',
      createdAt: Date.now(),
    });
    Alert.alert('成功', `${config.displayName} 已添加！`);
    navigation.goBack();
  };

  const handlePickWebp = async () => {
    try {
      const result = await importPetWebp();
      if (result) {
        setImportedPet(result);
        setPetName('');
      }
    } catch (e: any) {
      Alert.alert('导入失败', e.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!importedPet) return;
    const name = petName.trim();
    if (!name) {
      Alert.alert('提示', '请输入宠物名字');
      return;
    }
    await addPet({
      id: importedPet.config.id,
      configId: importedPet.config.id,
      name,
      source: 'imported',
      importedPath: importedPet.path,
      createdAt: Date.now(),
    });
    Alert.alert('成功', `${name} 已添加！`);
    setImportedPet(null);
    setPetName('');
    navigation.goBack();
  };

  if (importedPet) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>给你的新桌宠取个名字</Text>

        <View style={styles.importPreview}>
          <SpriteAnimation
            spritesheetUri={'file://' + importedPet.path + '/spritesheet.webp'}
            frameWidth={importedPet.config.frameWidth}
            columns={importedPet.config.columns}
            animation={
              importedPet.config.animations.idle || {row: 0, frames: 6, fps: 6}
            }
            allAnimations={importedPet.config.animations}
            scale={0.8}
          />
        </View>

        <TextInput
          style={styles.nameInput}
          value={petName}
          onChangeText={setPetName}
          placeholder="输入名字..."
          placeholderTextColor="#666"
          autoFocus
          maxLength={20}
        />

        <View style={styles.importActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setImportedPet(null)}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmImport}>
            <Text style={styles.confirmButtonText}>确认添加</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>内置角色</Text>
      {builtins.map(config => {
        const uri = getBuiltinSpritesheetUri(config.id);
        return (
          <TouchableOpacity
            key={config.id}
            style={styles.card}
            onPress={() => handleAddBuiltin(config)}>
            <View style={styles.preview}>
              <SpriteAnimation
                spritesheetUri={uri}
                frameWidth={config.frameWidth}
                columns={config.columns}
                animation={
                  config.animations.idle || {row: 0, frames: 6, fps: 6}
                }
                allAnimations={config.animations}
                scale={0.5}
              />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{config.displayName}</Text>
              <Text style={styles.desc}>{config.description}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.sectionTitle}>导入新桌宠</Text>
      <TouchableOpacity style={styles.importButton} onPress={handlePickWebp}>
        <Text style={styles.importIcon}>+</Text>
        <View>
          <Text style={styles.importText}>选择精灵图 (webp)</Text>
          <Text style={styles.importHint}>
            选择 Codex 宠物的 spritesheet.webp 文件
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e94560',
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  preview: {
    width: 100,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 12,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  desc: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  importButton: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f3460',
    borderStyle: 'dashed',
  },
  importIcon: {
    fontSize: 32,
    color: '#e94560',
    marginRight: 16,
    fontWeight: 'bold',
  },
  importText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importHint: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  importPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 16,
    paddingVertical: 24,
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  importActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
