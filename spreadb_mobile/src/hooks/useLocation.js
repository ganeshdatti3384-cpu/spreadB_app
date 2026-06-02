import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        Alert.alert(
          'Location Permission',
          'Allow SpreadB to access your location to show nearby campaigns and influencers.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc.coords);

      // Reverse geocode to get city name
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        const city = address.city || address.subregion || address.region || 'Unknown';
        setLocationName(city);
        return city;
      }
      return null;
    } catch (err) {
      console.log('Location error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { location, locationName, loading, error, requestLocation };
};
