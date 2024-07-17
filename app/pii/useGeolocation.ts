import { useState, useEffect } from 'react';

export const useGeolocation = () => {
  const [coordinates, setCoordinates] = useState<any>({ lat: null, lon: null });
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const getGeolocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoordinates({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          async (error) => {
            setError(error.message);
            try {
              const response = await fetch('http://ip-api.com/json');
              const data = await response.json();
              if (data.status === 'success') {
                setCoordinates({
                  lat: data.lat,
                  lon: data.lon,
                });
              } else {
                setError('Unable to retrieve location from IP');
              }
            } catch (err) {
              setError('Failed to fetch IP-based location');
            }
          }
        );
      } else {
        setError('Geolocation is not supported by this browser');
      }
    };

    getGeolocation();
  }, []);

  return { coordinates, error };
};

export default useGeolocation;
