import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Container} from '../types';
import {useStore} from '../store/useStore';
import {useNetworkStatus} from '../hooks/useNetworkStatus';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = [
  '#e94560',
  '#0f3460',
  '#16213e',
  '#533483',
  '#2c698d',
  '#e8630a',
];

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    containers,
    loadContainers,
    addContainer,
    deleteContainer,
    pendingSyncCount,
    updatePendingSyncCount,
    syncPendingOperations,
    setOfflineStatus,
  } = useStore();
  const {isOffline} = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [newContainer, setNewContainer] = useState({
    name: '',
    row: '1',
    column: 'A',
    description: '',
    color: COLORS[0],
    parentId: undefined as string | undefined,
  });

  // Update offline status in store
  useEffect(() => {
    setOfflineStatus(isOffline);
  }, [isOffline, setOfflineStatus]);

  // Update pending sync count on focus
  useFocusEffect(
    useCallback(() => {
      loadContainers();
      updatePendingSyncCount();
    }, [loadContainers, updatePendingSyncCount]),
  );

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOffline && pendingSyncCount > 0) {
      syncPendingOperations();
    }
  }, [isOffline, pendingSyncCount, syncPendingOperations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContainers();
    setRefreshing(false);
  };

  const handleAddContainer = async () => {
    if (!newContainer.name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el contenedor');
      return;
    }

    try {
      await addContainer(
        newContainer.name,
        parseInt(newContainer.row, 10),
        newContainer.column,
        newContainer.description || undefined,
        newContainer.color,
        newContainer.parentId,
      );
      setModalVisible(false);
      setNewContainer({
        name: '',
        row: '1',
        column: 'A',
        description: '',
        color: COLORS[0],
        parentId: undefined,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al crear contenedor');
    }
  };

  const handleDeleteContainer = (container: Container) => {
    Alert.alert(
      'Eliminar Contenedor',
      `Estas seguro de eliminar "${container.name}"? Se eliminaran todos los articulos dentro.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContainer(container.id);
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar el contenedor');
            }
          },
        },
      ],
    );
  };

  const getParentName = (parentId: string | undefined) => {
    if (!parentId) return null;
    const parent = containers.find(c => c.id === parentId);
    return parent?.name || null;
  };

  const renderContainer = ({item}: {item: Container}) => {
    const hasChildren = containers.some(c => c.parentId === item.id);

    return (
      <TouchableOpacity
        style={[styles.containerCard, {borderLeftColor: item.color || COLORS[0]}]}
        onPress={() => navigation.navigate('ContainerDetail', {containerId: item.id})}
        onLongPress={() => handleDeleteContainer(item)}>
        <View style={styles.containerHeader}>
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
          <View style={styles.badges}>
            {hasChildren && (
              <View style={styles.childBadge}>
                <Text style={styles.childBadgeText}>📦</Text>
              </View>
            )}
            {item.teamName && (
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>👥</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.containerName}>{item.name}</Text>
        {item.parentName && (
          <Text style={styles.parentInfo}>
            en {item.parentName}
          </Text>
        )}
        {item.description && !item.parentName && (
          <Text style={styles.containerDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.itemCount}>{item.itemCount} items</Text>
      </TouchableOpacity>
    );
  };

  const selectedParentName = getParentName(newContainer.parentId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Contenedores</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Sin conexion - Modo offline
          </Text>
          {pendingSyncCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingSyncCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Pending Sync Banner (when online but has pending) */}
      {!isOffline && pendingSyncCount > 0 && (
        <TouchableOpacity
          style={styles.syncingBanner}
          onPress={syncPendingOperations}>
          <Text style={styles.syncingBannerText}>
            Sincronizando {pendingSyncCount} cambios...
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={containers}
        renderItem={renderContainer}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e94560"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes contenedores</Text>
            <Text style={styles.emptySubtext}>
              Presiona + para agregar tu primer contenedor
            </Text>
          </View>
        }
      />

      {/* Add Container Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nuevo Contenedor</Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre (ej: Ropa de Invierno)"
                placeholderTextColor="#666"
                value={newContainer.name}
                onChangeText={text =>
                  setNewContainer(prev => ({...prev, name: text}))
                }
              />

              {/* Parent Container Selector */}
              <Text style={styles.inputLabel}>Contenedor padre (opcional)</Text>
              <TouchableOpacity
                style={styles.parentSelector}
                onPress={() => setShowParentPicker(!showParentPicker)}>
                <Text style={selectedParentName ? styles.parentSelectedText : styles.parentPlaceholder}>
                  {selectedParentName || 'Ninguno (nivel superior)'}
                </Text>
                <Text style={styles.parentChevron}>
                  {showParentPicker ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showParentPicker && (
                <View style={styles.parentPickerList}>
                  <TouchableOpacity
                    style={[
                      styles.parentOption,
                      !newContainer.parentId && styles.parentOptionSelected,
                    ]}
                    onPress={() => {
                      setNewContainer(prev => ({...prev, parentId: undefined}));
                      setShowParentPicker(false);
                    }}>
                    <Text style={styles.parentOptionText}>Ninguno (nivel superior)</Text>
                  </TouchableOpacity>
                  {containers.map(parent => (
                    <TouchableOpacity
                      key={parent.id}
                      style={[
                        styles.parentOption,
                        newContainer.parentId === parent.id && styles.parentOptionSelected,
                      ]}
                      onPress={() => {
                        setNewContainer(prev => ({...prev, parentId: parent.id}));
                        setShowParentPicker(false);
                      }}>
                      <Text style={styles.parentOptionIcon}>📦</Text>
                      <Text style={styles.parentOptionText}>{parent.name}</Text>
                      <Text style={styles.parentOptionLocation}>{parent.location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Columna</Text>
                  <View style={styles.pickerRow}>
                    {COLUMNS.slice(0, 4).map(col => (
                      <TouchableOpacity
                        key={col}
                        style={[
                          styles.pickerItem,
                          newContainer.column === col && styles.pickerItemSelected,
                        ]}
                        onPress={() =>
                          setNewContainer(prev => ({...prev, column: col}))
                        }>
                        <Text
                          style={[
                            styles.pickerText,
                            newContainer.column === col &&
                              styles.pickerTextSelected,
                          ]}>
                          {col}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Fila</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor="#666"
                    value={newContainer.row}
                    onChangeText={text =>
                      setNewContainer(prev => ({...prev, row: text}))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripcion (opcional)"
                placeholderTextColor="#666"
                value={newContainer.description}
                onChangeText={text =>
                  setNewContainer(prev => ({...prev, description: text}))
                }
                multiline
              />

              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorPicker}>
                {COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      {backgroundColor: color},
                      newContainer.color === color && styles.colorSelected,
                    ]}
                    onPress={() =>
                      setNewContainer(prev => ({...prev, color}))
                    }
                  />
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setShowParentPicker(false);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddContainer}>
                  <Text style={styles.saveButtonText}>Crear</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  offlineBanner: {
    backgroundColor: '#e8630a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  pendingBadgeText: {
    color: '#e8630a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncingBanner: {
    backgroundColor: '#2c698d',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncingBannerText: {
    color: '#fff',
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
  list: {
    padding: 10,
  },
  containerCard: {
    flex: 1,
    margin: 6,
    padding: 16,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  containerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationBadge: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  childBadge: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  childBadgeText: {
    fontSize: 10,
  },
  teamBadge: {
    backgroundColor: '#533483',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  teamBadgeText: {
    fontSize: 10,
  },
  containerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  parentInfo: {
    color: '#e94560',
    fontSize: 11,
    marginBottom: 4,
  },
  containerDescription: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  itemCount: {
    color: '#888',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  parentSelector: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parentPlaceholder: {
    color: '#666',
    fontSize: 16,
  },
  parentSelectedText: {
    color: '#fff',
    fontSize: 16,
  },
  parentChevron: {
    color: '#888',
    fontSize: 12,
  },
  parentPickerList: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 200,
  },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  parentOptionSelected: {
    backgroundColor: '#16213e',
  },
  parentOptionIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  parentOptionText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  parentOptionLocation: {
    color: '#888',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pickerItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#e94560',
  },
  pickerText: {
    color: '#888',
    fontWeight: '600',
  },
  pickerTextSelected: {
    color: '#fff',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0f3460',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e94560',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
