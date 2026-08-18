import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomNav } from '../components/BottomNav';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useClients } from '../services/queries';
import { colors } from '../utils/theme';

export function ClientsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const query = useClients();
  const clients = useMemo(() => (query.data ?? []).filter((client) => client.isActive && client.name.toLowerCase().includes(search.trim().toLowerCase())), [query.data, search]);
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}>
    <FlatList data={clients} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
      ListHeaderComponent={<><Text style={styles.title}>Clients</Text><Text style={styles.subtitle}>Choisissez un client pour créer rapidement un BL.</Text><TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Rechercher un client…" placeholderTextColor={colors.muted} /></>}
      renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AddBL', { clientId: item.id })}><View><Text style={styles.name}>{item.name}</Text><Text style={styles.hint}>Créer un BL</Text></View><View style={[styles.badge, item.isAccountClient && styles.account]}><Text style={styles.badgeText}>{item.isAccountClient ? 'ACCOUNT · EN COMPTE' : 'NORMAL'}</Text></View></TouchableOpacity>}
      ListEmptyComponent={query.isLoading ? <ActivityIndicator color={colors.blue} /> : <Text style={styles.empty}>{query.isError ? 'Chargement impossible.' : 'Aucun client trouvé.'}</Text>} />
  </View><BottomNav active="Clients" /></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { flex: 1 }, list: { padding: 16, paddingBottom: 90 }, title: { fontSize: 28, fontWeight: '900', color: colors.text }, subtitle: { color: colors.muted, marginTop: 5, marginBottom: 18 }, search: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, marginBottom: 16, color: colors.text }, card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, name: { color: colors.text, fontWeight: '800', fontSize: 17 }, hint: { color: colors.muted, fontSize: 12, marginTop: 4 }, badge: { backgroundColor: colors.greenSoft, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 6 }, account: { backgroundColor: '#EDE9FF' }, badgeText: { color: colors.text, fontSize: 10, fontWeight: '900' }, empty: { color: colors.muted, textAlign: 'center', padding: 30 } });
