import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useClients } from '../services/queries';
import { RootStackParamList } from '../navigation/RootNavigator';

type ClientsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Clients'>;

export function ClientsScreen() {
  const navigation = useNavigation<ClientsScreenNavigationProp>();
  const { data: clients, isLoading, isError, refetch } = useClients();
  const activeClients = clients?.filter((client) => client.isActive) ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clients</Text>
      {isLoading ? <ActivityIndicator /> : null}
      {isError ? (
        <View style={styles.state}>
          <Text>Impossible de charger les clients.</Text>
          <Button title="Réessayer" onPress={() => refetch()} />
        </View>
      ) : null}
      {!isLoading && !isError ? (
        <FlatList
          data={activeClients}
          keyExtractor={(client) => client.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.client} onPress={() => navigation.navigate('AddBL', { clientId: item.id })}>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientType}>{item.isAccountClient ? 'Client en compte' : 'Client comptant'}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.state}>Aucun client actif disponible.</Text>}
        />
      ) : null}
      <Button title="Retour" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 20 },
  client: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  clientName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  clientType: { marginTop: 4, color: '#475569' },
  state: { marginTop: 20, textAlign: 'center', color: '#475569' },
});
