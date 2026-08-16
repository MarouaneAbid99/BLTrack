import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useClients, useCreateBL } from '../services/queries';
import { paymentOptions } from '../utils/constants';
import { Client } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type AddBLScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddBL'>;
type AddBLScreenRouteProp = RouteProp<RootStackParamList, 'AddBL'>;

type CreateBLPayload = {
  blNumber: string;
  clientId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryDate: string;
  comments?: string;
};

export function AddBLScreen() {
  const navigation = useNavigation<AddBLScreenNavigationProp>();
  const route = useRoute<AddBLScreenRouteProp>();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { mutateAsync, isPending: isCreating } = useCreateBL();
  const [blNumber, setBlNumber] = useState('');
  const [clientId, setClientId] = useState(route.params?.clientId ?? '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [comments, setComments] = useState('');

  const handleSubmit = async () => {
    if (!blNumber.trim() || !clientId || !amount.trim()) {
      Alert.alert('Erreur', 'Numéro BL, client et montant sont requis.');
      return;
    }
    const value = Number(amount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) {
      Alert.alert('Erreur', 'Le montant doit être un nombre supérieur à 0.');
      return;
    }

    const payload: CreateBLPayload = {
      blNumber: blNumber.trim(),
      clientId,
      amount: value,
      paymentMethod,
      paymentStatus: paymentMethod === 'ACCOUNT' ? 'PENDING' : 'PAID',
      deliveryDate: new Date().toISOString(),
      comments: comments.trim() || undefined,
    };

    try {
      await mutateAsync(payload);
      Alert.alert('Succès', 'BL enregistré.', [{ text: 'OK', onPress: () => navigation.navigate('Home') }]);
    } catch (error: unknown) {
      const message = (error as any)?.response?.data?.error?.message;
      if (typeof message === 'string' && message.includes('already exists')) {
        Alert.alert('Erreur', 'Ce BL existe déjà.');
      } else {
        Alert.alert('Erreur', 'Impossible d’enregistrer le BL.');
      }
    }
  };

  const clientOptions = useMemo(() => clients?.filter((client) => client.isActive) ?? [], [clients]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ajouter un BL</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Numéro BL</Text>
          <TextInput value={blNumber} onChangeText={setBlNumber} style={styles.input} placeholder="Numéro BL" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Client</Text>
          {clientsLoading ? (
            <ActivityIndicator />
          ) : (
            clientOptions.map((client) => (
              <TouchableOpacity key={client.id} style={[styles.option, clientId === client.id && styles.optionSelected]} onPress={() => setClientId(client.id)}>
                <Text style={styles.optionText}>{client.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Montant</Text>
          <TextInput value={amount} onChangeText={setAmount} style={styles.input} keyboardType="decimal-pad" placeholder="Montant" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Date de livraison</Text>
          <Text style={styles.dateValue}>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Mode de paiement</Text>
          <View style={styles.paymentRow}>
            {paymentOptions.map((option) => (
              <TouchableOpacity key={option.value} style={[styles.paymentButton, paymentMethod === option.value && styles.paymentButtonActive]} onPress={() => setPaymentMethod(option.value)}>
                <Text style={[styles.paymentText, paymentMethod === option.value && styles.paymentTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Commentaire</Text>
          <TextInput value={comments} onChangeText={setComments} style={[styles.input, styles.textArea]} placeholder="Optionnel" multiline numberOfLines={4} />
        </View>
        <View style={styles.buttonRow}>
          <Button title="Annuler" onPress={() => navigation.goBack()} />
          <Button title="Enregistrer" onPress={handleSubmit} disabled={isCreating} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14, color: '#334155' },
  input: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  dateValue: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, color: '#334155' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  option: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  optionSelected: { borderColor: '#0284c7', backgroundColor: '#e0f2fe' },
  optionText: { fontSize: 16, color: '#334155' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  paymentButton: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, alignItems: 'center' },
  paymentButtonActive: { backgroundColor: '#0284c7', borderColor: '#0369a1' },
  paymentText: { fontSize: 14, color: '#334155' },
  paymentTextActive: { color: '#ffffff', fontWeight: '700' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
});
