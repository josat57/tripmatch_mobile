import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Linking } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trips } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

export default function TripLocationScreen() {
  const { id, tripTitle } = useLocalSearchParams<{ id: string; tripTitle?: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    if (!id) return;
    try {
      const data = await Trips.getById(id);
      setTrip(data as any);
    } catch {
      Alert.alert('Error', 'Could not load trip location.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip Location' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  const location = trip?.locations?.address;
  const lat = location?.latitude;
  const lng = location?.longitude;
  const hasCoordinates = lat && lng;

  const openMap = async () => {
    if (!hasCoordinates) return;
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open map');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: tripTitle || 'Trip Location' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Map Button */}
        {hasCoordinates && (
          <TouchableOpacity style={styles.mapButton} onPress={openMap}>
            <Ionicons name="map" size={24} color={Colors.white} />
            <Text style={styles.mapButtonText}>Open Map</Text>
          </TouchableOpacity>
        )}

        {/* Location Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Ionicons name="location-outline" size={24} color={Colors.primary} />
            <Text style={styles.detailsTitle}>Location Details</Text>
          </View>

          {location?.street && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Street</Text>
              <Text style={styles.detailValue}>{location.street}</Text>
            </View>
          )}

          {location?.city && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>{location.city}</Text>
            </View>
          )}

          {location?.country && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Country</Text>
              <Text style={styles.detailValue}>{location.country}</Text>
            </View>
          )}

          {hasCoordinates && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Latitude</Text>
                <Text style={styles.detailValue}>{lat?.toFixed(6)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Longitude</Text>
                <Text style={styles.detailValue}>{lng?.toFixed(6)}</Text>
              </View>
            </>
          )}

          {!location && (
            <Text style={styles.noLocationText}>Location information not available</Text>
          )}
        </View>

        {/* Coordinates Attribution */}
        {hasCoordinates && (
          <Text style={styles.attribution}>
            Coordinates: {lat?.toFixed(6)}, {lng?.toFixed(6)}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapButtonText: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.white,
  },
  mapContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: { height: 300, width: '100%' },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
  },
  detailRow: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textDark,
  },
  noLocationText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  attribution: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});
