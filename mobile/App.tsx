import React, {useEffect} from 'react';
import {StatusBar, ActivityIndicator, View, StyleSheet, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  LoginScreen,
  RegisterScreen,
  HomeScreen,
  ContainerDetailScreen,
  AddItemsScreen,
  EditItemScreen,
  SearchScreen,
  SettingsScreen,
  TeamsScreen,
  TeamDetailScreen,
  BorrowedItemsScreen,
  QRScannerScreen,
} from './src/screens';
import {RootStackParamList, MainTabParamList} from './src/types';
import {useStore} from './src/store/useStore';
import {networkStatus} from './src/services/networkStatus';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#0f3460',
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({color}) => (
            <TabIcon icon="📦" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: ({color}) => (
            <TabIcon icon="📷" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Buscar',
          tabBarIcon: ({color}) => (
            <TabIcon icon="🔍" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Config',
          tabBarIcon: ({color}) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({icon}: {icon: string; color: string}) {
  return (
    <Text style={styles.tabIconText}>{icon}</Text>
  );
}

function App() {
  const {isAuthenticated, isLoading, loadAuthState} = useStore();

  useEffect(() => {
    // Initialize network status monitoring
    networkStatus.initialize();
    loadAuthState();

    return () => {
      networkStatus.cleanup();
    };
  }, [loadAuthState]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: {backgroundColor: '#1a1a2e'},
          }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen} />
              <Stack.Screen name="AddItems" component={AddItemsScreen} />
              <Stack.Screen name="EditItem" component={EditItemScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="Teams" component={TeamsScreen} />
              <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
              <Stack.Screen name="BorrowedItems" component={BorrowedItemsScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  tabIconText: {
    fontSize: 22,
  },
});

export default App;
