import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';

import { colors } from './src/theme';
import { StoreProvider } from './src/state/store';
import SwipeScreen from './src/screens/SwipeScreen';
import QueueScreen from './src/screens/QueueScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Swipe: undefined;
  Queue: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.screenBg,
    card: colors.screenBg,
    text: colors.cream,
    border: colors.cream13,
    primary: colors.cream,
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontError) {
      // Fonts sind nicht hart erforderlich — App startet trotzdem (System-Font-Fallback).
      // eslint-disable-next-line no-console
      console.warn('Font-Ladefehler:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loader}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.cream} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="light" />
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              initialRouteName="Swipe"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.screenBg },
                animation: 'slide_from_bottom',
              }}
            >
              <Stack.Screen name="Swipe" component={SwipeScreen} options={{ animation: 'fade' }} />
              <Stack.Screen
                name="Queue"
                component={QueueScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ presentation: 'modal' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },
  loader: {
    flex: 1,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
