import React from 'react';
import { Text, View, StyleSheet, Platform, Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../theme';

const LogoTitle = ({ title }) => (
  <View style={styles.headerLogoRow}>
    <Image
      source={require('../assets/logo.png')}
      style={styles.headerLogoImg}
      resizeMode="contain"
    />
    <Text style={styles.headerLogoText}>{title}</Text>
  </View>
);

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
import AdminBlogScreen from '../screens/blogs/AdminBlogScreen';
import ExportScreen from '../screens/export/ExportScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CompanionScreen from '../screens/companion/CompanionScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.surface,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: COLORS.primary,
  headerTitleStyle: { ...FONTS.bold, fontSize: 18, color: COLORS.text },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: COLORS.background },
  animation: 'slide_from_right',
};

// -- Analyze Stack --
function AnalyzeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AnalyzeMain" component={AnalyzeScreen} options={{ headerTitle: () => <LogoTitle title="Analyze" /> }} />
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
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ headerTitle: () => <LogoTitle title="Dashboard" /> }} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: 'Suggestions' }} />
    </Stack.Navigator>
  );
}

// -- Blog Stack --
function BlogStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BlogList" component={BlogListScreen} options={{ headerTitle: () => <LogoTitle title="Articles" /> }} />
      <Stack.Screen name="BlogDetail" component={BlogDetailScreen} options={{ title: 'Article' }} />
      <Stack.Screen name="AdminBlog" component={AdminBlogScreen} options={{ title: 'Write Article' }} />
    </Stack.Navigator>
  );
}

// -- More Stack (Profile, Export) --
function MoreStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerTitle: () => <LogoTitle title="Profile" /> }} />
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export & Reports' }} />
      <Stack.Screen name="AnalysisHistory" component={AnalysisHistoryScreen} options={{ title: 'Analysis History' }} />
      <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} options={{ title: 'Chat Imports' }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: 'Chat Details' }} />
    </Stack.Navigator>
  );
}

// -- Companion Stack --
function CompanionStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CompanionMain"
        component={CompanionScreen}
        options={{ headerTitle: () => <LogoTitle title="Companion" /> }}
      />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  Analyze: 'manage-search',
  Dashboard: 'insert-chart-outlined',
  Companion: 'chat',
  Blogs: 'article',
  More: 'person-outline',
};

function TabIcon({ routeName, focused }) {
  const iconName = TAB_ICONS[routeName] || 'circle';
  const color = focused ? COLORS.primary : COLORS.textLight;
  return (
    <View style={styles.tabIconContainer}>
      {focused && (
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeIndicator}
        />
      )}
      <View style={focused ? styles.tabIconBgActive : styles.tabIconBg}>
        <MaterialIcons name={iconName} size={22} color={color} />
      </View>
    </View>
  );
}

// -- Main Tab Navigator --
export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          ...SHADOWS.medium,
        },
        tabBarLabelStyle: {
          ...FONTS.semiBold,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Analyze" component={AnalyzeStack} />
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Companion" component={CompanionStack} options={{ tabBarLabel: 'Companion' }} />
      <Tab.Screen name="Blogs" component={BlogStack} options={{ tabBarLabel: 'Articles' }} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImg: {
    width: 28,
    height: 28,
    marginRight: 8,
    borderRadius: 14,
  },
  headerLogoText: {
    ...FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 34,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  tabIconBg: {
    width: 36,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconBgActive: {
    width: 36,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '12',
  },
});
