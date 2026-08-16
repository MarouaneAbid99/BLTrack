import { useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../services/auth';
import { apiBaseUrl } from '../services/api';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Erreur', "Nom d'utilisateur et mot de passe requis.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result?.error?.message === 'Invalid username or password') {
          Alert.alert('Identifiants incorrects.', 'Veuillez vérifier votre nom d’utilisateur et mot de passe.');
        } else {
          Alert.alert('Erreur', 'Impossible de contacter le serveur.');
        }
        return;
      }
      await login(result.token, result.user);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Text style={styles.title}>BLTrack Courrier</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Nom d'utilisateur</Text>
        <TextInput value={username} onChangeText={setUsername} style={styles.input} autoCapitalize="none" autoCorrect={false} placeholder="Nom d'utilisateur" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholder="Mot de passe" />
      </View>
      <View style={styles.buttonContainer}>
        {loading ? <ActivityIndicator /> : <Button title="Se connecter" onPress={handleLogin} />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, marginBottom: 24, fontWeight: '700', textAlign: 'center' },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14, color: '#334155' },
  input: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  buttonContainer: { marginTop: 16 },
});
