import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Item} from '../types';
import {useStore} from '../store/useStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {searchResults, searchQuery, searchItems, clearSearch} = useStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.length < 2) {
        clearSearch();
        return;
      }

      setLoading(true);
      await searchItems(text);
      setLoading(false);
    },
    [searchItems, clearSearch],
  );

  const renderItem = ({item}: {item: Item}) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate('EditItem', {item})}
      onLongPress={() =>
        navigation.navigate('ContainerDetail', {containerId: item.containerId})
      }>
      <Image
        source={{uri: item.thumbnailUrl || item.imageUrl}}
        style={styles.resultImage}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.resultDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.resultLocation}>
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>{item.containerLocation}</Text>
          </View>
          <Text style={styles.containerName}>{item.containerName}</Text>
        </View>
        {item.aiTags?.length > 0 && (
          <View style={styles.tags}>
            {item.aiTags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar articulos..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setQuery('');
              clearSearch();
            }}>
            <Text style={styles.clearButtonText}>x</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No se encontraron resultados
                </Text>
                <Text style={styles.emptySubtext}>
                  Intenta con otras palabras clave
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Busca tus articulos</Text>
                <Text style={styles.emptySubtext}>
                  Escribe al menos 2 caracteres para buscar
                </Text>
              </View>
            )
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
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  resultImage: {
    width: 100,
    height: 100,
    backgroundColor: '#0f3460',
  },
  resultInfo: {
    flex: 1,
    padding: 12,
  },
  resultName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultDescription: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  resultLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  containerName: {
    color: '#888',
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: '#888',
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
    textAlign: 'center',
  },
});
