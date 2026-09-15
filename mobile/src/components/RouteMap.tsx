import { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { regionForRoute, type RoutePoint } from '../lib/geo';
import { colors } from '../theme';

/** Google Maps view with the run route drawn as a polyline (start = dark, finish = orange). */
export function RouteMap({
  route,
  follow,
  style,
  interactive = true,
}: {
  route: RoutePoint[];
  /** Keep the camera centred on the latest point (live tracking). */
  follow?: { lat: number; lng: number } | null;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
}) {
  const ref = useRef<MapView>(null);
  const region = regionForRoute(route) ?? (follow ? { latitude: follow.lat, longitude: follow.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 } : null);

  useEffect(() => {
    if (follow) ref.current?.animateCamera({ center: { latitude: follow.lat, longitude: follow.lng } }, { duration: 500 });
  }, [follow?.lat, follow?.lng]);

  useEffect(() => {
    if (!follow && route.length > 1) {
      ref.current?.fitToCoordinates(route.map((p) => ({ latitude: p.lat, longitude: p.lng })), {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [route.length > 1]);

  const segments: RoutePoint[][] = [];
  for (const p of route) {
    if (p.seg || segments.length === 0) segments.push([]);
    segments[segments.length - 1].push(p);
  }
  const start = route[0];
  const end = route[route.length - 1];

  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      initialRegion={region ?? { latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      showsUserLocation={!!follow}
      followsUserLocation={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
    >
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          coordinates={seg.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          strokeColor={colors.primary}
          strokeWidth={5}
        />
      ))}
      {start && <Marker coordinate={{ latitude: start.lat, longitude: start.lng }} pinColor={colors.dark} title="Start" />}
      {end && !follow && route.length > 1 && <Marker coordinate={{ latitude: end.lat, longitude: end.lng }} pinColor={colors.primary} title="Finish" />}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden' } });
