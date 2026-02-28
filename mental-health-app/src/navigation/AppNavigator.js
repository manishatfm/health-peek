import React from 'react';
import { Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, FONTS } from '../theme';

// Screens
import AnalyzeScreen from '../screens/analysis/AnalyzeScreen';
import ChatImportScreen from '../screens/analysis/ChatImportScreen';
import AnalysisHistoryScreen from '../screens/analysis/AnalysisHistoryScreen';
import ChatHistoryScreen from '../screens/analysis/ChatHistoryScreen';
import ChatDetailScreen from '../screens/analysis/ChatDetailScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SuggestionsScreen from '../screens/dashboard/SuggestionsScreen';
import BlogListScreen from '../screens/blogs/BlogListScreen';
import BlogDetailScreen from '../screens/blogs/BlogDetailScreen';
import ExportScreen from '../screens/export/ExportScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { ...FONTS.bold, fontSize: 18 },
  headerShadowVisible: false,
};

// -- Analyze Stack --
function AnalyzeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AnalyzeMain" component={AnalyzeScreen} options={{ title: 'Analyze' }} />
      <Stack.Screen name="ChatImport" component={ChatImportScreen} options={{ title: 'Import Chat' }} />
      <Stack.Screen name="AnalysisHistory" component={AnalysisHistoryScreen} options={{ title: 'Analysis History' }} />
      <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} options={{ title: 'Chat Imports' }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: 'Chat Details' }} />
    </Stack.Navigator>
  );
}

// -- Dashboard Stack --
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: 'Suggestions' }} />
    </Stack.Navigator>
  );
}

// -- Blog Stack --
function BlogStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BlogList" component={BlogListScreen} options={{ title: 'Articles' }} />
      <Stack.Screen name="BlogDetail" component={BlogDetailScreen} options={{ title: 'Article' }} />
    </Stack.Navigator>
  );
}

// -- More Stack (Profile, Export) --
function MoreStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export & Reports' }} />
      <Stack.Screen name="AnalysisHistory" component={AnalysisHistoryScreen} options={{ title: 'Analysis History' }} />
      <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} options={{ title: 'Chat Imports' }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: 'Chat Details' }} />
    </Stack.Navigator>
  );
}

// Simple emoji-based tab icon
function _TabIcon({ icon, focused }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.5 }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </View>
  );
}

// -- Main Tab Navigator --
export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.divider,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          ...FONTS.semiBold,
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="Analyze"
        component={AnalyzeStack}
        options={{
          tabBarIcon: ({ focused }) => <_TabIcon icon="🔍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ focused }) => <_TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Blogs"
        component={BlogStack}
        options={{
          tabBarIcon: ({ focused }) => <_TabIcon icon="📚" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{
          tabBarIcon: ({ focused }) => <_TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
