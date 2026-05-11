import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {updatePet} from '../services/PetStorage';

export default function RenamePetScreen({route, navigation}: any) {
  const {petId, currentName} = route.params;
  const [name, setName] = useState(currentName);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('提示', '名字不能为空');
      return;
    }
    await updatePet(petId, {name: trimmed});
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>给你的桌宠取个名字</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="输入名字..."
        placeholderTextColor="#666"
        autoFocus
        maxLength={20}
      />
      <Text style={styles.counter}>{name.length}/20</Text>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
    justifyContent: 'center',
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  counter: {
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
