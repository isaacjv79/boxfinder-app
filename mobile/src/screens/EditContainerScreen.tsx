import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Container} from '../types';
import {api} from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'EditContainer'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = [
  '#e94560',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e74c3c',
  '#34495e',
];

export const EditContainerScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const {container} = route.params;

  const [name, setName] = useState(container.name);
  const [description, setDescription] = useState(container.description || '');
  const [column, setColumn] = useState(container.column);
  const [row, setRow] = useState(container.row.toString());
  const [color, setColor] = useState(container.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!column.trim()) {
      Alert.alert('Error', 'La columna es requerida');
      return;
    }

    const rowNumber = parseInt(row, 10);
    if (isNaN(rowNumber) || rowNumber < 1) {
      Alert.alert('Error', 'La fila debe ser un numero valido');
      return;
    }

    setSaving(true);
    try {
      await api.updateContainer(container.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        column: column.trim().toUpperCase(),
        row: rowNumber,
        color,
      });
      Alert.alert('Exito', 'Contenedor actualizado', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el contenedor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
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
              await api.deleteContainer(container.id);
              navigation.navigate('Main');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el contenedor');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Contenedor</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del contenedor"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Descripcion (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripcion del contenedor"
          placeholderTextColor="#666"
          multiline
          numberOfLines={3}
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Columna</Text>
            <TextInput
              style={styles.input}
              value={column}
              onChangeText={text => setColumn(text.toUpperCase())}
              placeholder="A"
              placeholderTextColor="#666"
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Fila</Text>
            <TextInput
              style={styles.input}
              value={row}
              onChangeText={setRow}
              placeholder="1"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorPicker}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorOption,
                {backgroundColor: c},
                color === c && styles.colorSelected,
              ]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Eliminar Contenedor</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
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
  saveButton: {
    backgroundColor: '#e94560',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
});
