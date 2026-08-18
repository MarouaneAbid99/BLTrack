import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../utils/theme';

type MainRoute = 'Home' | 'Clients' | 'Reports';

export function BottomNav({ active }: { active: MainRoute }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const open = (route: MainRoute) => navigation.reset({ index: 0, routes: [{ name: route }] });
  const items: Array<{ route: MainRoute; icon: string; label: string }> = [
    { route: 'Home', icon: '▤', label: 'BL' },
    { route: 'Clients', icon: '♙', label: 'Clients' },
    { route: 'Reports', icon: '▥', label: 'Rapports' },
  ];
  return (
    <View style={styles.bar}>
      {items.map((item) => (
        <TouchableOpacity key={item.route} style={styles.item} onPress={() => open(item.route)} accessibilityRole="button">
          <Text style={[styles.icon, active === item.route && styles.active]}>{item.icon}</Text>
          <Text style={[styles.label, active === item.route && styles.active]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', minHeight: 68, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 23, color: colors.muted },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted },
  active: { color: colors.blueDark },
});
