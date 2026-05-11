import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  NativeModules,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useFocusEffect} from '@react-navigation/native';
import {PetWithConfig} from '../types';
import {
  getAllPets,
  getPetWithConfig,
  getSelectedPetId,
  setSelectedPetId,
  initDefaultPets,
  deletePet,
  getOverlaySpritesheetUri,
} from '../services/PetStorage';
import SpriteAnimation from '../components/SpriteAnimation';

const {OverlayModule} = NativeModules;

export default function HomeScreen({navigation}: any) {
  const [pets, setPets] = useState<PetWithConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlayActive, setOverlayActive] = useState(false);
  const [petScale, setPetScale] = useState(1.0);

  const loadPets = useCallback(async () => {
    await initDefaultPets();
    const allPets = await getAllPets();
    const withConfigs = await Promise.all(
      allPets.map(p => getPetWithConfig(p)),
    );
    setPets(withConfigs.filter(Boolean) as PetWithConfig[]);
    const selId = await getSelectedPetId();
    setSelectedId(selId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [loadPets]),
  );

  const handleSelect = async (pet: PetWithConfig) => {
    await setSelectedPetId(pet.id);
    setSelectedId(pet.id);
  };

  const handleDelete = (pet: PetWithConfig) => {
    Alert.alert('删除宠物', `确定要删除 "${pet.name}" 吗？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deletePet(pet.id);
          loadPets();
        },
      },
    ]);
  };

  const handleToggleOverlay = async () => {
    if (!selectedId) {
      Alert.alert('提示', '请先选择一个桌宠');
      return;
    }

    try {
      if (overlayActive) {
        await OverlayModule.stopOverlay();
        setOverlayActive(false);
      } else {
        const pet = pets.find(p => p.id === selectedId);
        if (!pet) return;

        const hasPermission = await OverlayModule.checkPermission();
        if (!hasPermission) {
          await OverlayModule.requestPermission();
          return;
        }

        const overlayUri = getOverlaySpritesheetUri(pet);
        await OverlayModule.startOverlay(
          overlayUri,
          pet.config.frameWidth,
          pet.config.columns,
          JSON.stringify(pet.config.animations),
          petScale,
        );
        setOverlayActive(true);
      }
    } catch (e: any) {
      Alert.alert('错误', e.message);
    }
  };

  const renderPet = ({item}: {item: PetWithConfig}) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        style={[styles.petCard, isSelected && styles.petCardSelected]}
        onPress={() => handleSelect(item)}
        onLongPress={() => handleDelete(item)}>
        <View style={styles.petPreview}>
          <SpriteAnimation
            spritesheetUri={item.spritesheetUri}
            frameWidth={item.config.frameWidth}
            columns={item.config.columns}
            animation={item.config.animations.idle || {row: 0, frames: 6, fps: 6}}
            allAnimations={item.config.animations}
            scale={0.6}
          />
        </View>
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{item.name}</Text>
          <Text style={styles.petDesc}>{item.config.description}</Text>
          <Text style={styles.petSource}>
            {item.source === 'builtin' ? '内置' : '导入'}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>当前</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <Text style={styles.title}>我的桌宠</Text>
        <Text style={styles.subtitle}>
          {pets.length} 个宠物 · 长按删除
        </Text>
      </View>

      <FlatList
        data={pets}
        renderItem={renderPet}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>还没有桌宠，点击下方添加</Text>
        }
      />

      <View style={styles.scaleBar}>
        <Text style={styles.scaleLabel}>大小</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.3}
          maximumValue={3.0}
          step={0.1}
          value={petScale}
          onValueChange={setPetScale}
          minimumTrackTintColor="#e94560"
          maximumTrackTintColor="#0f3460"
          thumbTintColor="#e94560"
        />
        <Text style={styles.scaleValue}>{petScale.toFixed(1)}x</Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPet')}>
          <Text style={styles.addButtonText}>+ 添加桌宠</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.overlayButton,
            overlayActive && styles.overlayButtonActive,
          ]}
          onPress={handleToggleOverlay}>
          <Text style={styles.overlayButtonText}>
            {overlayActive ? '关闭悬浮窗' : '开启悬浮窗'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedId && (
        <TouchableOpacity
          style={styles.renameButton}
          onPress={() => {
            const pet = pets.find(p => p.id === selectedId);
            if (pet) navigation.navigate('RenamePet', {petId: pet.id, currentName: pet.name});
          }}>
          <Text style={styles.renameButtonText}>重命名</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  petCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  petCardSelected: {
    borderColor: '#e94560',
  },
  petPreview: {
    width: 120,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 12,
    overflow: 'hidden',
  },
  petInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  petDesc: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  petSource: {
    fontSize: 12,
    color: '#e94560',
    marginTop: 6,
  },
  selectedBadge: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scaleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scaleLabel: {
    color: '#aaa',
    fontSize: 14,
    width: 36,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scaleValue: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#0f3460',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlayButton: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  overlayButtonActive: {
    backgroundColor: '#533483',
  },
  overlayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  renameButton: {
    position: 'absolute',
    right: 16,
    top: 20,
    backgroundColor: '#0f3460',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renameButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
  },
});
