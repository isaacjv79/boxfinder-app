import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, UpdateItemDto} from '../types';
import {api} from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'EditItem'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  'ropa',
  'decoracion',
  'herramientas',
  'electronica',
  'libros',
  'juguetes',
  'cocina',
  'documentos',
  'deportes',
  'jardin',
  'otro',
];

export const EditItemScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const {item} = route.params;

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [category, setCategory] = useState(item.category || 'otro');
  const [tags, setTags] = useState<string[]>(item.aiTags || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  // Borrowed state
  const [isBorrowed, setIsBorrowed] = useState(item.isBorrowed || false);
  const [borrowedTo, setBorrowedTo] = useState(item.borrowedTo || '');
  const [borrowedNote, setBorrowedNote] = useState(item.borrowedNote || '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (isBorrowed && !borrowedTo.trim()) {
      Alert.alert('Error', 'Indica a quien se presto el articulo');
      return;
    }

    setSaving(true);
    try {
      // Update item details
      const updateData: UpdateItemDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        aiTags: tags,
      };
      await api.updateItem(item.id, updateData);

      // Update borrowed status if changed
      if (isBorrowed !== item.isBorrowed || borrowedTo !== item.borrowedTo) {
        await api.borrowItem(item.id, {
          isBorrowed,
          borrowedTo: isBorrowed ? borrowedTo.trim() : undefined,
          borrowedNote: isBorrowed ? borrowedNote.trim() : undefined,
        });
      }

      Alert.alert('Exito', 'Articulo actualizado', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el articulo');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Articulo</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{uri: item.thumbnailUrl || item.imageUrl}}
            style={styles.itemImage}
          />
          {item.aiConfidence && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                IA: {Math.round(item.aiConfidence * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del articulo"
            placeholderTextColor="#666"
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripcion</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripcion del articulo"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Category Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Categoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tags Editor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Etiquetas (para busqueda)</Text>
          <View style={styles.tagsContainer}>
            {tags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onPress={() => removeTag(tag)}>
                <Text style={styles.tagText}>{tag}</Text>
                <Text style={styles.tagRemove}>x</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addTagContainer}>
            <TextInput
              style={[styles.input, styles.tagInput]}
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Nueva etiqueta..."
              placeholderTextColor="#666"
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Text style={styles.addTagButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Borrowed Section */}
        <View style={styles.borrowedSection}>
          <View style={styles.borrowedHeader}>
            <Text style={styles.label}>Prestado</Text>
            <Switch
              value={isBorrowed}
              onValueChange={setIsBorrowed}
              trackColor={{false: '#0f3460', true: '#e94560'}}
              thumbColor={isBorrowed ? '#fff' : '#888'}
            />
          </View>

          {isBorrowed && (
            <>
              <TextInput
                style={styles.input}
                value={borrowedTo}
                onChangeText={setBorrowedTo}
                placeholder="Nombre de la persona"
                placeholderTextColor="#666"
              />
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={borrowedNote}
                onChangeText={setBorrowedNote}
                placeholder="Nota (opcional)"
                placeholderTextColor="#666"
              />
              {item.borrowedAt && (
                <Text style={styles.borrowedDate}>
                  Prestado el: {new Date(item.borrowedAt).toLocaleDateString()}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Location Info (read-only) */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Ubicacion</Text>
          <Text style={styles.infoValue}>
            {item.containerName} ({item.containerLocation})
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  itemImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#0f3460',
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#0f3460',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#888',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  categoryChipActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 6,
  },
  tagRemove: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    marginRight: 12,
  },
  addTagButton: {
    backgroundColor: '#0f3460',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
  },
  borrowedSection: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  borrowedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteInput: {
    marginTop: 12,
  },
  borrowedDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
