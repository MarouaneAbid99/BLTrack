import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useClients, useCreateAvoir, useCreateBL } from '../services/queries';
import { apiDate, colors, formatDH, today } from '../utils/theme';

export function AddBLScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBL'>>();
  const clientsQuery = useClients(); const createBL = useCreateBL(); const createAvoir = useCreateAvoir();
  const [blNumber, setBlNumber] = useState(''); const [clientId, setClientId] = useState(route.params?.clientId ?? '');
  const [blDate, setBlDate] = useState(today()); const [amount, setAmount] = useState(''); const [comments, setComments] = useState('');
  const [withAvoir, setWithAvoir] = useState(false); const [brReference, setBrReference] = useState(''); const [avoirDate, setAvoirDate] = useState(today()); const [avoirAmount, setAvoirAmount] = useState('');
  const [error, setError] = useState('');
  const clients = useMemo(() => (clientsQuery.data ?? []).filter((c) => c.isActive), [clientsQuery.data]);
  const selectedClient = clients.find((c) => c.id === clientId);
  const gross = Number(amount.replace(',', '.')) || 0; const credit = withAvoir ? Number(avoirAmount.replace(',', '.')) || 0 : 0;
  const submit = async () => {
    setError('');
    if (!blNumber.trim() || !clientId || gross <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(blDate)) return setError('Numéro, client, date valide et montant positif sont requis.');
    if (withAvoir && (!brReference.trim() || credit <= 0 || credit >= gross || !/^\d{4}-\d{2}-\d{2}$/.test(avoirDate))) return setError('L’avoir requiert une référence, une date et un montant positif strictement inférieur au BL.');
    let bl;
    try {
      bl = await createBL.mutateAsync({ blNumber: blNumber.trim(), clientId, amount: gross, blDate: apiDate(blDate), comments: comments.trim() || undefined, payment: { amount: gross, status: selectedClient?.isAccountClient ? 'EN_COMPTE' : 'UNPAID' } });
    } catch (caught: unknown) { setError((caught as any)?.response?.data?.error?.message ?? 'Impossible d’enregistrer le BL.'); return; }
    if (withAvoir) {
      try { await createAvoir.mutateAsync({ blId: bl.id, payload: { brReference: brReference.trim(), avoirDate: apiDate(avoirDate), amount: credit } }); }
      catch { Alert.alert('BL enregistré', 'L’avoir n’a pas pu être ajouté. Vous pouvez le reprendre depuis le détail du BL.'); navigation.replace('BLDetail', { blId: bl.id }); return; }
    }
    navigation.replace('BLDetail', { blId: bl.id });
  };
  const saving = createBL.isPending || createAvoir.isPending;
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Retour</Text></TouchableOpacity><Text style={styles.title}>Ajouter un BL</Text>
    <Label text="Numéro BL"/><TextInput style={styles.input} value={blNumber} onChangeText={setBlNumber} placeholder="BL-000123" />
    <Label text="Client"/>{clientsQuery.isLoading ? <ActivityIndicator /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{clients.map((client) => <TouchableOpacity key={client.id} style={[styles.choice, clientId === client.id && styles.selected]} onPress={() => setClientId(client.id)}><Text style={[styles.choiceText, clientId === client.id && styles.selectedText]}>{client.name}{client.isAccountClient ? ' · compte' : ''}</Text></TouchableOpacity>)}</ScrollView>}
    <Label text="Date BL (AAAA-MM-JJ)"/><TextInput style={styles.input} value={blDate} onChangeText={setBlDate} placeholder="2026-08-17" />
    <Label text="Montant BL"/><TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
    <Label text="Commentaire"/><TextInput style={[styles.input, styles.area]} value={comments} onChangeText={setComments} multiline placeholder="Optionnel" />
    <TouchableOpacity style={styles.toggle} onPress={() => setWithAvoir(!withAvoir)}><Text style={styles.toggleText}>{withAvoir ? '☑' : '☐'} Ajouter un avoir avec ce BL</Text></TouchableOpacity>
    {withAvoir ? <View style={styles.avoirBox}><Text style={styles.boxTitle}>Avoir</Text><Label text="Référence BR"/><TextInput style={styles.input} value={brReference} onChangeText={setBrReference}/><Label text="Date avoir"/><TextInput style={styles.input} value={avoirDate} onChangeText={setAvoirDate}/><Label text="Montant avoir (positif)"/><TextInput style={styles.input} value={avoirAmount} onChangeText={setAvoirAmount} keyboardType="decimal-pad"/></View> : null}
    <View style={styles.total}><Text style={styles.totalLabel}>Net estimé</Text><Text style={styles.totalValue}>{formatDH(Math.max(0, gross - credit))}</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}
    <TouchableOpacity style={[styles.submit, saving && styles.disabled]} disabled={saving} onPress={() => void submit()}><Text style={styles.submitText}>{saving ? 'Enregistrement…' : 'Enregistrer le BL'}</Text></TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 18, paddingBottom: 40 }, back: { color: colors.blueDark, fontWeight: '800', fontSize: 16 }, title: { color: colors.text, fontWeight: '900', fontSize: 28, marginTop: 20, marginBottom: 10 }, demo: { color: colors.amber, backgroundColor: colors.amberSoft, padding: 12, borderRadius: 12, marginBottom: 8 }, label: { color: colors.text, fontWeight: '700', marginTop: 15, marginBottom: 7 }, input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.text }, area: { minHeight: 84, paddingTop: 13, textAlignVertical: 'top' }, choices: { gap: 8 }, choice: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10 }, selected: { backgroundColor: colors.navy, borderColor: colors.navy }, choiceText: { color: colors.text, fontWeight: '700' }, selectedText: { color: 'white' }, toggle: { paddingVertical: 18 }, toggleText: { color: colors.blueDark, fontWeight: '800', fontSize: 15 }, avoirBox: { padding: 14, backgroundColor: colors.sky, borderRadius: 17 }, boxTitle: { color: colors.text, fontWeight: '900', fontSize: 18 }, total: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginTop: 18, borderWidth: 1, borderColor: colors.border }, totalLabel: { color: colors.muted }, totalValue: { color: colors.blueDark, fontWeight: '900', fontSize: 18 }, error: { color: colors.red, backgroundColor: colors.redSoft, padding: 12, borderRadius: 12, marginTop: 12 }, submit: { backgroundColor: colors.blueDark, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginTop: 16 }, disabled: { opacity: .55 }, submitText: { color: 'white', fontWeight: '900', fontSize: 16 } });
