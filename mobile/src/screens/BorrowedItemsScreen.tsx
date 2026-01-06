import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Item} from '../types';
import {api} from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BorrowedItemsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBorrowedItems = async () => {
    try {
      const data = await api.getBorrowedItems();
      setItems(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los articulos prestados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBorrowedItems();
    }, []),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadBorrowedItems();
  };

  const handleReturnItem = (item: Item) => {
    Alert.alert(
      'Devolver Articulo',
      `¿${item.borrowedTo} devolvio "${item.name}"?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Si, devuelto',
          onPress: async () => {
            try {
              await api.returnItem(item.id);
              loadBorrowedItems();
              Alert.alert('Exito', 'Articulo marcado como devuelto');
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el articulo');
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString();
  };

  const renderItem = ({item}: {item: Item}) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('EditItem', {item})}>
      <Image
        source={{uri: item.thumbnailUrl || item.imageUrl}}
        style={styles.itemImage}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.borrowedInfo}>
          <Text style={styles.borrowedTo}>
            Prestado a: <Text style={styles.borrowedName}>{item.borrowedTo}</Text>
          </Text>
          {item.borrowedAt && (
            <Text style={styles.borrowedDate}>
              {formatDate(item.borrowedAt)}
            </Text>
          )}
        </View>
        <Text style={styles.itemLocation} numberOfLines={1}>
          📍 {item.containerName}
        </Text>
        {item.borrowedNote && (
          <Text style={styles.borrowedNote} numberOfLines={1}>
            💬 {item.borrowedNote}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.returnButton}
        onPress={() => handleReturnItem(item)}>
        <Text style={styles.returnButtonText}>✓</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Articulos Prestados</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats */}
      {items.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{items.length}</Text>
            <Text style={styles.statLabel}>
              {items.length === 1 ? 'articulo' : 'articulos'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {new Set(items.map(i => i.borrowedTo)).size}
            </Text>
            <Text style={styles.statLabel}>
              {new Set(items.map(i => i.borrowedTo)).size === 1
                ? 'persona'
                : 'personas'}
            </Text>
          </View>
        </View>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Sin prestamos</Text>
          <Text style={styles.emptyText}>
            No tienes articulos prestados. Cuando prestes algo, aparecera aqui
            para que no lo olvides.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#e94560"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#16213e',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statNumber: {
    color: '#e94560',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#0f3460',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#0f3460',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  borrowedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  borrowedTo: {
    color: '#888',
    fontSize: 13,
  },
  borrowedName: {
    color: '#e94560',
    fontWeight: '600',
  },
  borrowedDate: {
    color: '#666',
    fontSize: 11,
  },
  itemLocation: {
    color: '#666',
    fontSize: 12,
  },
  borrowedNote: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  returnButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  returnButtonText: {
    color: '#4ade80',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
