import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../services/auth';
import { AddBLScreen } from '../screens/AddBLScreen';
import { BLDetailScreen } from '../screens/BLDetailScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Clients: undefined;
  AddBL: { clientId?: string } | undefined;
  BLDetail: { blId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Clients" component={ClientsScreen} />
          <Stack.Screen name="AddBL" component={AddBLScreen} />
          <Stack.Screen name="BLDetail" component={BLDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
