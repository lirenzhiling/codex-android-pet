import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import AddPetScreen from './src/screens/AddPetScreen';
import RenamePetScreen from './src/screens/RenamePetScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: '#1a1a2e'},
          headerTintColor: '#e94560',
          headerTitleStyle: {fontWeight: 'bold'},
          contentStyle: {backgroundColor: '#1a1a2e'},
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="AddPet"
          component={AddPetScreen}
          options={{title: '添加桌宠'}}
        />
        <Stack.Screen
          name="RenamePet"
          component={RenamePetScreen}
          options={{title: '重命名'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
