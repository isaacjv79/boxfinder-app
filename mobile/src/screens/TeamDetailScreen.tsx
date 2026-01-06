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
import {useRoute, useNavigation, RouteProp, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, TeamWithMembers, TeamMember} from '../types';
import {api} from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'TeamDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const TeamDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const {teamId} = route.params;

  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const loadTeam = async () => {
    try {
      const data = await api.getTeam(teamId);
      setTeam(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el equipo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [teamId]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeam();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert('Error', 'Ingresa un email valido');
      return;
    }

    setInviting(true);
    try {
      await api.inviteTeamMember(teamId, inviteEmail.trim());
      setInviteEmail('');
      setShowInviteModal(false);
      loadTeam();
      Alert.alert('Exito', 'Miembro agregado correctamente');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo invitar al miembro';
      Alert.alert('Error', message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      'Remover Miembro',
      `¿Estas seguro de remover a ${member.userName} del equipo?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeTeamMember(teamId, member.id);
              loadTeam();
              Alert.alert('Exito', 'Miembro removido');
            } catch (error) {
              Alert.alert('Error', 'No se pudo remover al miembro');
            }
          },
        },
      ],
    );
  };

  const handleDeleteTeam = () => {
    Alert.alert(
      'Eliminar Equipo',
      '¿Estas seguro de eliminar este equipo? Los contenedores compartidos volveran a ser privados.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTeam(teamId);
              Alert.alert('Exito', 'Equipo eliminado');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el equipo');
            }
          },
        },
      ],
    );
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'viewer':
        return 'Solo lectura';
      default:
        return 'Miembro';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#e94560';
      case 'viewer':
        return '#666';
      default:
        return '#0f3460';
    }
  };

  const renderMemberItem = ({item}: {item: TeamMember}) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {item.userName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.userName}</Text>
        <Text style={styles.memberEmail}>{item.userEmail}</Text>
      </View>
      <View style={[styles.roleBadge, {backgroundColor: getRoleColor(item.role)}]}>
        <Text style={styles.roleText}>{getRoleLabel(item.role)}</Text>
      </View>
      {item.role !== 'admin' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item)}>
          <Text style={styles.removeButtonText}>x</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Equipo no encontrado</Text>
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
        <Text style={styles.headerTitle}>{team.name}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteTeam}>
          <Text style={styles.deleteButtonText}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Team Info */}
      <View style={styles.teamInfo}>
        <View style={styles.teamIcon}>
          <Text style={styles.teamIconText}>
            {team.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.teamMeta}>
          {team.memberCount} {team.memberCount === 1 ? 'miembro' : 'miembros'}
        </Text>
      </View>

      {/* Members Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Miembros</Text>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setShowInviteModal(true)}>
          <Text style={styles.inviteButtonText}>+ Invitar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={team.members}
        renderItem={renderMemberItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#e94560"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyMembers}>
            <Text style={styles.emptyText}>No hay miembros</Text>
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invitar Miembro</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el email del usuario registrado
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="email@ejemplo.com"
              placeholderTextColor="#666"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalInviteButton,
                  inviting && styles.modalButtonDisabled,
                ]}
                onPress={handleInvite}
                disabled={inviting}>
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalInviteText}>Invitar</Text>
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
  errorText: {
    color: '#888',
    fontSize: 16,
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
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  teamInfo: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  teamIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamIconText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  teamName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamMeta: {
    color: '#888',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    color: '#888',
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyMembers: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
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
  modalInviteButton: {
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
  modalInviteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
