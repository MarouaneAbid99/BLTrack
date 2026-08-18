import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomNav } from '../components/BottomNav';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../services/auth';
import { useBLs, useBLSummary } from '../services/queries';
import { BLFilter, paymentLabel } from '../utils/domain';
import { colors, formatDate, formatDH } from '../utils/theme';

const filters: Array<{ value: BLFilter; label: string }> = [
  { value: 'ALL', label: 'Tous' }, { value: 'PAID', label: 'Payés' },
  { value: 'UNPAID', label: 'Non payé' }, { value: 'EN_COMPTE', label: 'En compte' },
];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BLFilter>('ALL');
  const list = useBLs(search, filter);
  const summary = useBLSummary();
  const refreshing = list.isRefetching || summary.isRefetching;
  const reload = () => { void list.refetch(); void summary.refetch(); };
  const cards = [
    ['Total BL', summary.data?.totalBLs ?? 0], ['Montant BL', formatDH(summary.data?.totalAmount ?? 0)],
    ['Payés', summary.data?.paid ?? 0], ['Non payé', summary.data?.unpaid ?? 0], ['En compte', summary.data?.enCompte ?? 0],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <FlatList
          data={list.data?.data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
          ListHeaderComponent={<>
            <View style={styles.header}><View><Text style={styles.hello}>Bonjour</Text><Text style={styles.name}>{user?.fullName ?? 'Utilisateur'}</Text></View><View style={styles.logo}><Text style={styles.logoText}>BL</Text></View></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metrics}>
              {cards.map(([label, value]) => <View style={styles.metric} key={String(label)}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>)}
            </ScrollView>
            <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Rechercher BL, client ou BR…" placeholderTextColor={colors.muted} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((item) => <TouchableOpacity key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}><Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={styles.sectionTitle}>Bons de livraison</Text>
            {list.isError ? <TouchableOpacity style={styles.error} onPress={() => void list.refetch()}><Text style={styles.errorText}>Chargement impossible · Réessayer</Text></TouchableOpacity> : null}
          </>}
          renderItem={({ item }) => {
            const status = item.payment?.status ?? 'UNPAID';
            return <TouchableOpacity style={styles.blCard} onPress={() => navigation.navigate('BLDetail', { blId: item.id })}>
              <View style={styles.row}><Text style={styles.blNumber}>{item.blNumber}</Text><View style={[styles.badge, status === 'PAID' ? styles.paid : status === 'EN_COMPTE' ? styles.account : styles.unpaid]}><Text style={styles.badgeText}>{paymentLabel(status)}</Text></View></View>
              <Text style={styles.client}>{item.client.name}</Text><Text style={styles.date}>{formatDate(item.blDate)}</Text>
              <View style={styles.amountRow}><View><Text style={styles.amountLabel}>Montant BL</Text><Text style={styles.gross}>{formatDH(item.amount)}</Text></View>{Number(item.totalAvoirAmount) > 0 ? <View><Text style={styles.amountLabel}>Avoir</Text><Text style={styles.avoir}>−{formatDH(item.totalAvoirAmount)}</Text></View> : null}<View><Text style={styles.amountLabel}>Net</Text><Text style={styles.net}>{formatDH(item.netAmount)}</Text></View></View>
              {Number(item.paymentDifferenceAmount) > 0 ? <Text style={styles.overpayment}>Surpaiement : +{formatDH(item.paymentDifferenceAmount ?? 0)}</Text> : null}
              {item.payment?.method ? <Text style={styles.method}>{item.payment.method === 'CASH' ? 'Espèces' : 'Chèque'}</Text> : null}
            </TouchableOpacity>;
          }}
          ListEmptyComponent={list.isLoading ? <ActivityIndicator color={colors.blue} /> : <Text style={styles.empty}>Aucun BL ne correspond à votre recherche.</Text>}
          contentContainerStyle={styles.list}
        />
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddBLChoice')}><Text style={styles.fabText}>＋</Text></TouchableOpacity>
      </View>
      <BottomNav active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { flex: 1 }, list: { padding: 16, paddingBottom: 92 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, hello: { color: colors.muted, fontSize: 14 }, name: { color: colors.text, fontSize: 26, fontWeight: '800' },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }, logoText: { color: 'white', fontWeight: '900' },
  metrics: { gap: 10, paddingBottom: 18 }, metric: { width: 130, minHeight: 82, padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, metricLabel: { color: colors.muted, fontSize: 12, marginBottom: 8 }, metricValue: { color: colors.text, fontWeight: '800', fontSize: 17 },
  search: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, fontSize: 15, color: colors.text },
  filters: { gap: 8, paddingVertical: 14 }, filter: { paddingHorizontal: 16, minHeight: 42, justifyContent: 'center', borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, filterActive: { backgroundColor: colors.navy, borderColor: colors.navy }, filterText: { color: colors.muted, fontWeight: '700' }, filterTextActive: { color: 'white' },
  sectionTitle: { fontSize: 19, color: colors.text, fontWeight: '800', marginBottom: 10 }, blCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, blNumber: { fontSize: 18, fontWeight: '800', color: colors.text }, client: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 5 }, date: { color: colors.muted, fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }, paid: { backgroundColor: colors.greenSoft }, unpaid: { backgroundColor: colors.amberSoft }, account: { backgroundColor: '#EDE9FF' }, badgeText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border }, amountLabel: { color: colors.muted, fontSize: 11 }, gross: { color: colors.text, fontWeight: '700', marginTop: 3 }, avoir: { color: colors.red, fontWeight: '700', marginTop: 3 }, net: { color: colors.blueDark, fontWeight: '900', marginTop: 3 }, overpayment: { color: colors.amber, fontWeight: '800', fontSize: 12, marginTop: 10 }, method: { color: colors.muted, fontSize: 12, marginTop: 10 },
  error: { backgroundColor: colors.redSoft, padding: 12, borderRadius: 12, marginBottom: 10 }, errorText: { color: colors.red, textAlign: 'center', fontWeight: '700' }, empty: { color: colors.muted, textAlign: 'center', padding: 30 },
  fab: { position: 'absolute', right: 22, bottom: 18, width: 62, height: 62, borderRadius: 31, backgroundColor: colors.blueDark, alignItems: 'center', justifyContent: 'center', elevation: 7, shadowColor: '#000', shadowOpacity: .2, shadowRadius: 8 }, fabText: { color: 'white', fontSize: 35, lineHeight: 38 },
});
