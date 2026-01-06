import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {RootStackParamList, Item} from '../types';
import {api} from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'AddItems'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AddedItem {
  imageUri: string;
  item?: Item;
  loading: boolean;
  error?: string;
}

export const AddItemsScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: true,
    });

    if (result.assets?.[0]?.base64 && result.assets[0].uri) {
      await processImage(result.assets[0].uri, result.assets[0].base64);
    }
  };

  const handleSelectFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: true,
      selectionLimit: 5,
    });

    if (result.assets) {
      for (const asset of result.assets) {
        if (asset.base64 && asset.uri) {
          await processImage(asset.uri, asset.base64);
        }
      }
    }
  };

  const processImage = async (uri: string, base64: string) => {
    const newItem: AddedItem = {
      imageUri: uri,
      loading: true,
    };

    setAddedItems(prev => [...prev, newItem]);
    setProcessing(true);

    try {
      const item = await api.addItem({
        containerId: route.params.containerId,
        imageBase64: base64,
      });

      setAddedItems(prev =>
        prev.map(i =>
          i.imageUri === uri ? {...i, item, loading: false} : i,
        ),
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar imagen';
      setAddedItems(prev =>
        prev.map(i =>
          i.imageUri === uri
            ? {...i, loading: false, error: errorMessage}
            : i,
        ),
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveItem = async (index: number) => {
    const item = addedItems[index];
    if (item.item) {
      try {
        await api.deleteItem(item.item.id);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
    setAddedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDone = () => {
    const successCount = addedItems.filter(i => i.item).length;
    if (successCount > 0) {
      Alert.alert(
        'Articulos Agregados',
        `Se agregaron ${successCount} articulo(s) exitosamente`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Agregar Articulos</Text>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Listo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraButtons}>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleTakePhoto}
          disabled={processing}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.cameraButtonText}>Tomar Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cameraButton, styles.galleryButton]}
          onPress={handleSelectFromGallery}
          disabled={processing}>
          <Text style={styles.cameraIcon}>🖼️</Text>
          <Text style={styles.cameraButtonText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        La IA identificara automaticamente cada articulo
      </Text>

      <ScrollView style={styles.itemsList}>
        {addedItems.map((item, index) => (
          <View key={index} style={styles.addedItem}>
            <Image source={{uri: item.imageUri}} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              {item.loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#e94560" />
                  <Text style={styles.loadingText}>Analizando con IA...</Text>
                </View>
              ) : item.error ? (
                <Text style={styles.errorText}>{item.error}</Text>
              ) : item.item ? (
                <>
                  <Text style={styles.itemName}>{item.item.name}</Text>
                  {item.item.category && (
                    <Text style={styles.itemCategory}>{item.item.category}</Text>
                  )}
                  {item.item.aiConfidence != null && item.item.aiConfidence > 0 && (
                    <Text style={styles.confidence}>
                      Confianza: {Math.round(item.item.aiConfidence * 100)}%
                    </Text>
                  )}
                </>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(index)}>
              <Text style={styles.removeButtonText}>x</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {addedItems.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>
            Toma fotos de los articulos que quieres guardar
          </Text>
        </View>
      )}
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
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  galleryButton: {
    backgroundColor: '#0f3460',
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addedItem: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: '#0f3460',
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginLeft: 8,
    fontSize: 12,
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
    marginBottom: 2,
  },
  confidence: {
    color: '#888',
    fontSize: 10,
  },
  errorText: {
    color: '#e94560',
    fontSize: 12,
  },
  removeButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
