import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
  CameraPermissionStatus,
} from 'react-native-vision-camera';
import {RootStackParamList} from '../types';
import {api} from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const device = useCameraDevice('back');

  // Request camera permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    };
    requestPermissions();
  }, []);

  // Activate camera when screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      setIsProcessing(false);
      return () => {
        setIsActive(false);
      };
    }, []),
  );

  // Handle QR code scan
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (isProcessing || codes.length === 0) {
        return;
      }

      const qrCode = codes[0].value;
      if (!qrCode) {
        return;
      }

      setIsProcessing(true);
      handleQRCode(qrCode);
    },
  });

  const handleQRCode = async (qrCode: string) => {
    try {
      // Try to find container by QR code
      const container = await api.getContainerByQr(qrCode);

      if (container) {
        // Navigate to container detail
        navigation.navigate('ContainerDetail', {containerId: container.id});
      } else {
        Alert.alert(
          'No encontrado',
          'No se encontro ningun contenedor con este codigo QR.',
          [{text: 'OK', onPress: () => setIsProcessing(false)}],
        );
      }
    } catch (error: any) {
      // Check if it's a 404 (container not found)
      if (error.response?.status === 404) {
        Alert.alert(
          'Contenedor no encontrado',
          'Este codigo QR no corresponde a ningun contenedor. ¿Deseas crear uno nuevo?',
          [
            {text: 'Cancelar', onPress: () => setIsProcessing(false)},
            {
              text: 'Crear contenedor',
              onPress: () => {
                // Go back to home and show create modal
                navigation.navigate('Main');
                setIsProcessing(false);
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'No se pudo procesar el codigo QR.', [
          {text: 'OK', onPress: () => setIsProcessing(false)},
        ]);
      }
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  // Loading state
  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Solicitando permisos...</Text>
      </View>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Acceso a camara requerido</Text>
        <Text style={styles.permissionText}>
          BoxFinder necesita acceso a la camara para escanear codigos QR de tus
          contenedores.
        </Text>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Abrir Configuracion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No camera device
  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionIcon}>⚠️</Text>
        <Text style={styles.permissionTitle}>Camara no disponible</Text>
        <Text style={styles.permissionText}>
          No se pudo acceder a la camara del dispositivo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && !isProcessing}
        codeScanner={codeScanner}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Escanear QR</Text>
          <Text style={styles.headerSubtitle}>
            Apunta al codigo QR del contenedor
          </Text>
        </View>

        {/* Scanner Frame */}
        <View style={styles.scannerFrame}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#e94560" />
            <Text style={styles.processingText}>Buscando contenedor...</Text>
          </View>
        )}

        {/* Bottom info */}
        <View style={styles.bottomInfo}>
          <Text style={styles.infoText}>
            Escanea el codigo QR de un contenedor para ver su contenido
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  permissionIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  settingsButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#e94560',
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#e94560',
    borderTopRightRadius: 12,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 50,
    height: 50,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#e94560',
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#e94560',
    borderBottomRightRadius: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  bottomInfo: {
    paddingBottom: 120,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
});
