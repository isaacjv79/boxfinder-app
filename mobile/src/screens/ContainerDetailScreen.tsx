import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {useRoute, useNavigation, RouteProp, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import {RootStackParamList, ContainerWithItems, Item, ContainerChild} from '../types';
import {api} from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'ContainerDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ContainerDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const [container, setContainer] = useState<ContainerWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadContainer();
    }, [route.params.containerId])
  );

  const loadContainer = async () => {
    try {
      const data = await api.getContainer(route.params.containerId);
      setContainer(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el contenedor');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: Item) => {
    navigation.navigate('EditItem', {item});
  };

  const handleDeleteItem = async (item: Item) => {
    Alert.alert(
      'Eliminar Articulo',
      `Estas seguro de eliminar "${item.name}"?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteItem(item.id);
              loadContainer();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el articulo');
            }
          },
        },
      ],
    );
  };

  const navigateToChild = (child: ContainerChild) => {
    navigation.push('ContainerDetail', {containerId: child.id});
  };

  const renderItem = ({item}: {item: Item}) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleEditItem(item)}
      onLongPress={() => handleDeleteItem(item)}>
      <Image
        source={{uri: item.thumbnailUrl || item.imageUrl}}
        style={styles.itemImage}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.category && (
          <Text style={styles.itemCategory}>{item.category}</Text>
        )}
        {item.isBorrowed && (
          <View style={styles.borrowedBadge}>
            <Text style={styles.borrowedBadgeText}>Prestado</Text>
          </View>
        )}
        {item.aiConfidence && !item.isBorrowed && (
          <Text style={styles.confidence}>
            IA: {Math.round(item.aiConfidence * 100)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderChildContainer = ({item}: {item: ContainerChild}) => (
    <TouchableOpacity
      style={styles.childCard}
      onPress={() => navigateToChild(item)}>
      <View style={styles.childIcon}>
        <Text style={styles.childIconText}>📦</Text>
      </View>
      <View style={styles.childInfo}>
        <Text style={styles.childName}>{item.name}</Text>
        {item.location && (
          <Text style={styles.childLocation}>{item.location}</Text>
        )}
      </View>
      <Text style={styles.childChevron}>{'>'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!container) {
    return null;
  }

  const hasChildren = container.children && container.children.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.containerName}>{container.name}</Text>
          <Text style={styles.containerLocation}>
            Ubicacion: {container.location}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQR(!showQR)}>
          <Text style={styles.qrButtonText}>QR</Text>
        </TouchableOpacity>
      </View>

      {/* Path Breadcrumb */}
      {container.path && (
        <View style={styles.pathContainer}>
          <Text style={styles.pathLabel}>Ruta:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.pathText}>{container.path}</Text>
          </ScrollView>
        </View>
      )}

      {/* Team Badge */}
      {container.teamName && (
        <View style={styles.teamBadgeContainer}>
          <View style={styles.teamBadge}>
            <Text style={styles.teamBadgeIcon}>👥</Text>
            <Text style={styles.teamBadgeText}>{container.teamName}</Text>
          </View>
        </View>
      )}

      {/* QR Code Display */}
      {showQR && (
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={container.qrCode}
              size={200}
              backgroundColor="#fff"
              color="#000"
            />
          </View>
          <Text style={styles.qrHint}>
            Escanea este codigo para agregar articulos
          </Text>
        </View>
      )}

      {/* Children Containers */}
      {hasChildren && (
        <View style={styles.childrenSection}>
          <Text style={styles.sectionTitle}>
            Sub-contenedores ({container.children?.length})
          </Text>
          <FlatList
            data={container.children}
            renderItem={renderChildContainer}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childrenList}
          />
        </View>
      )}

      {/* Items List */}
      <FlatList
        data={container.items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Articulos ({container.items?.length || 0})
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin articulos</Text>
            <Text style={styles.emptySubtext}>
              Usa el escaner para agregar articulos
            </Text>
          </View>
        }
      />

      {/* Add Items Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate('AddItems', {
            containerId: container.id,
            qrCode: container.qrCode,
          })
        }>
        <Text style={styles.addButtonText}>+ Agregar Articulos</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  containerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  containerLocation: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  qrButton: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0f3460',
  },
  pathLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 8,
  },
  pathText: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: '500',
  },
  teamBadgeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  teamBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  teamBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#16213e',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  qrHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 12,
  },
  childrenSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  childrenList: {
    paddingHorizontal: 16,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  childIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childIconText: {
    fontSize: 20,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  childLocation: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  childChevron: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  list: {
    padding: 10,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 6,
  },
  itemCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0f3460',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCategory: {
    color: '#e94560',
    fontSize: 12,
  },
  borrowedBadge: {
    backgroundColor: '#e94560',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  borrowedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  confidence: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#e94560',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
