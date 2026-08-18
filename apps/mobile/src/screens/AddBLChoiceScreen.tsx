import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../utils/theme';

export function AddBLChoiceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <SafeAreaView style={styles.safe}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Retour</Text></TouchableOpacity><Text style={styles.title}>Nouveau BL</Text><Text style={styles.subtitle}>L’OCR sera disponible dans une phase ultérieure.</Text><View style={styles.options}>
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AddBL')}><Text style={styles.icon}>＋</Text><Text style={styles.cardTitle}>Saisie manuelle</Text><Text style={styles.cardText}>Renseignez les données du bon de livraison.</Text></TouchableOpacity>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, padding: 18, backgroundColor: colors.background }, back: { color: colors.blueDark, fontWeight: '800', fontSize: 16 }, title: { fontSize: 29, fontWeight: '900', color: colors.text, marginTop: 28 }, subtitle: { color: colors.muted, marginTop: 5 }, options: { gap: 14, marginTop: 28 }, card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 22, minHeight: 160 }, icon: { color: colors.blueDark, fontSize: 34 }, cardTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 13 }, cardText: { color: colors.muted, marginTop: 7, lineHeight: 20 } });
