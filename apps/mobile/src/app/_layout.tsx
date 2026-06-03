import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: '#1A1A1A',
          },
          tabBarActiveTintColor: '#E8470A',
          tabBarInactiveTintColor: '#A0A0A0',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Library',
          }}
        />
        <Tabs.Screen
          name="player"
          options={{
            title: 'Now Playing',
          }}
        />
      </Tabs>
    </>
  );
}
