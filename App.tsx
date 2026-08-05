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
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';

import { colors } from './src/theme';
import { StoreProvider } from './src/state/store';
import { PurchasesProvider } from './src/state/purchases';
import { getOnboardingCompleted } from './src/db/flags';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import SwipeScreen from './src/screens/SwipeScreen';
import QueueScreen from './src/screens/QueueScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StatsScreen from './src/screens/StatsScreen';
import PaywallScreen from './src/screens/PaywallScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Swipe: undefined;
  Queue: undefined;
  Settings: undefined;
  Stats: undefined;
  Paywall: { freedBytes?: number } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.canvas,
    card: colors.canvas,
    text: colors.text,
    border: colors.glassBorder,
    primary: colors.text,
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  const [onboardingDone, setOnboardingDone] = React.useState<boolean | null>(null);

  useEffect(() => {
    if (fontError) {
      // Fonts sind nicht hart erforderlich — App startet trotzdem (System-Font-Fallback).
      // eslint-disable-next-line no-console
      console.warn('Font-Ladefehler:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    void getOnboardingCompleted().then(setOnboardingDone);
  }, []);

  if ((!fontsLoaded && !fontError) || onboardingDone === null) {
    return (
      <View style={styles.loader}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StoreProvider>
          <PurchasesProvider>
            <StatusBar style="light" />
            <NavigationContainer theme={navTheme}>
              <Stack.Navigator
                initialRouteName={onboardingDone ? 'Swipe' : 'Onboarding'}
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.canvas },
                  animation: 'slide_from_bottom',
                }}
              >
                <Stack.Screen
                  name="Onboarding"
                  component={OnboardingScreen}
                  options={{ animation: 'fade' }}
                />
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
                <Stack.Screen
                  name="Stats"
                  component={StatsScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="Paywall"
                  component={PaywallScreen}
                  options={{ presentation: 'modal' }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </PurchasesProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  loader: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
