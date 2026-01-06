import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Team} from '../types';
import {api} from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const TeamsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTeams = async () => {
    try {
      const data = await api.getTeams();
      setTeams(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los equipos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, []),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeams();
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Error', 'El nombre del equipo es requerido');
      return;
    }

    setCreating(true);
    try {
      await api.createTeam(newTeamName.trim());
      setNewTeamName('');
      setShowCreateModal(false);
      loadTeams();
      Alert.alert('Exito', 'Equipo creado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el equipo');
    } finally {
      setCreating(false);
    }
  };

  const renderTeamItem = ({item}: {item: Team}) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('TeamDetail', {teamId: item.id})}>
      <View style={styles.teamIcon}>
        <Text style={styles.teamIconText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.teamMeta}>
          {item.memberCount} {item.memberCount === 1 ? 'miembro' : 'miembros'}
        </Text>
        {item.ownerName && (
          <Text style={styles.teamOwner}>Creado por: {item.ownerName}</Text>
        )}
      </View>
      <Text style={styles.chevron}>{'>'}</Text>
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
        <Text style={styles.headerTitle}>Equipos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Team List */}
      {teams.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>Sin equipos</Text>
          <Text style={styles.emptyText}>
            Crea un equipo para compartir contenedores con tu familia o
            companeros
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}>
            <Text style={styles.createButtonText}>Crear Equipo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={teams}
          renderItem={renderTeamItem}
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

      {/* Create Team Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Equipo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del equipo"
              placeholderTextColor="#666"
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTeamName('');
                }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreateButton,
                  creating && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateTeam}
                disabled={creating}>
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalCreateText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
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
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#e94560',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teamIconText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamMeta: {
    color: '#888',
    fontSize: 14,
  },
  teamOwner: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: '#666',
    fontSize: 20,
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#0f3460',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreateButton: {
    flex: 1,
    padding: 14,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#e94560',
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
