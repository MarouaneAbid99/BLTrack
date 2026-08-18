import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../services/auth';
import { AddBLScreen } from '../screens/AddBLScreen';
import { BLDetailScreen } from '../screens/BLDetailScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { AddBLChoiceScreen } from '../screens/AddBLChoiceScreen';
import { EditBLScreen } from '../screens/EditBLScreen';
import { AvoirFormScreen } from '../screens/AvoirFormScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import type { AvoirRecord } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Clients: undefined;
  Reports: undefined;
  AddBLChoice: undefined;
  AddBL: { clientId?: string } | undefined;
  BLDetail: { blId: string };
  EditBL: { blId: string };
  AvoirForm: { blId: string; avoir?: AvoirRecord };
  Payment: { blId: string };
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
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="AddBLChoice" component={AddBLChoiceScreen} />
          <Stack.Screen name="AddBL" component={AddBLScreen} />
          <Stack.Screen name="BLDetail" component={BLDetailScreen} />
          <Stack.Screen name="EditBL" component={EditBLScreen} />
          <Stack.Screen name="AvoirForm" component={AvoirFormScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
