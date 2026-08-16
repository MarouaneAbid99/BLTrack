import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { RootStackParamList } from '../navigation/RootNavigator';
import { BLRecord } from '../types';

type BLDetailRouteProp = RouteProp<RootStackParamList, 'BLDetail'>;

type BLDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BLDetail'>;

export function BLDetailScreen() {
  const navigation = useNavigation<BLDetailNavigationProp>();
  const route = useRoute<BLDetailRouteProp>();
  const { data, isLoading } = useQuery<BLRecord, Error>({
    queryKey: ['blDetail', route.params.blId],
    queryFn: async () => {
      const response = await api.get<BLRecord>(`/api/bls/${route.params.blId}`);
      return response.data;
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Détails du BL</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Numéro BL</Text>
          <Text style={styles.value}>{data?.blNumber}</Text>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{data?.client.name}</Text>
          <Text style={styles.label}>Montant</Text>
          <Text style={styles.value}>{data?.amount} €</Text>
          <Text style={styles.label}>Mode de paiement</Text>
          <Text style={styles.value}>{data?.paymentMethod}</Text>
          <Text style={styles.label}>Statut</Text>
          <Text style={styles.value}>{data?.paymentStatus}</Text>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{data?.deliveryDate ? new Date(data.deliveryDate).toLocaleString() : '—'}</Text>
          <Text style={styles.label}>Coursier</Text>
          <Text style={styles.value}>{data?.courier.fullName}</Text>
          <Text style={styles.label}>Commentaire</Text>
          <Text style={styles.value}>{data?.comments || 'Aucun commentaire'}</Text>
        </View>
      )}
      <Button title="Retour" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc', minHeight: '100%' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontSize: 14, color: '#64748b', marginTop: 12 },
  value: { fontSize: 16, color: '#0f172a', marginTop: 4 },
});
