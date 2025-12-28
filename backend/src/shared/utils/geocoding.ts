import { Client, UnitSystem } from '@googlemaps/google-maps-services-js';
import env from '../config/env';
import logger from './logger';

const client = new Client({});

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Convert address to geographic coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const response = await client.geocode({
      params: {
        address,
        key: env.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.results.length === 0) {
      logger.warn(`No geocoding results for address: ${address}`);
      return null;
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    logger.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Calculate distance matrix between origins and destinations
 */
export async function calculateDistanceMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>
): Promise<number[][]> {
  try {
    const response = await client.distancematrix({
      params: {
        origins: origins.map((o) => `${o.lat},${o.lng}`),
        destinations: destinations.map((d) => `${d.lat},${d.lng}`),
        key: env.GOOGLE_MAPS_API_KEY,
        units: UnitSystem.metric,
      },
    });

    return response.data.rows.map((row) =>
      row.elements.map((element) => {
        if (element.status === 'OK' && element.distance) {
          return element.distance.value / 1000; // Convert meters to kilometers
        }
        return Infinity;
      })
    );
  } catch (error) {
    logger.error('Distance matrix error:', error);
    throw error;
  }
}

