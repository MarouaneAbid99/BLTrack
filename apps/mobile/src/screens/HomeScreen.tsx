import { useMemo } from 'react';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../services/auth';
import { useBLs, useDailySummary } from '../services/queries';
import { RootStackParamList } from '../navigation/RootNavigator';

const formatAmount = (value: string) => `${value} €`;

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useDailySummary();
  const { data: bls, isLoading: blLoading, isError: blError, refetch: refetchBLs } = useBLs();

  const totalBLs = summary?.totalBLs ?? 0;
  const blList = bls?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bonjour, {user?.fullName ?? 'coursier'}</Text>
        <View style={styles.headerButtons}>
          <Button title="Clients" onPress={() => navigation.navigate('Clients')} />
          <Button title="Ajouter un BL" onPress={() => navigation.navigate('AddBL')} />
          <Button title="Déconnexion" onPress={logout} />
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Livraisons aujourd'hui</Text>
        {summaryError || blError ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>Impossible de charger le tableau de bord.</Text>
            <Button title="Réessayer" onPress={() => { void refetchSummary(); void refetchBLs(); }} />
          </View>
        ) : summaryLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.summaryText}>BL livrés: {totalBLs}</Text>
            <Text style={styles.summaryText}>Total: {summary?.totalAmount ? formatAmount(summary.totalAmount) : '0.00 €'}</Text>
            <Text style={styles.summaryText}>Espèces: {summary?.cashAmount ? formatAmount(summary.cashAmount) : '0.00 €'}</Text>
            <Text style={styles.summaryText}>Chèques: {summary?.chequeAmount ? formatAmount(summary.chequeAmount) : '0.00 €'}</Text>
            <Text style={styles.summaryText}>En compte: {summary?.accountAmount ? formatAmount(summary.accountAmount) : '0.00 €'}</Text>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Liste des BL du jour</Text>
      {summaryError || blError ? null : blLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={blList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemCard} onPress={() => navigation.navigate('BLDetail', { blId: item.id })}>
              <Text style={styles.itemTitle}>{item.blNumber}</Text>
              <Text style={styles.itemText}>{item.client.name}</Text>
              <Text style={styles.itemText}>{formatAmount(item.amount)}</Text>
              <Text style={styles.itemText}>{item.paymentMethod}</Text>
              <Text style={styles.itemText}>{item.paymentStatus}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun BL trouvé pour aujourd'hui.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  headerButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  summaryText: { fontSize: 16, marginBottom: 4, color: '#334155' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  itemCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  itemText: { fontSize: 14, color: '#475569' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 },
  errorState: { gap: 12 },
  errorText: { color: '#b91c1c' },
});
