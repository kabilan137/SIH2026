import { MapPin, Search, Locate } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchConfig } from '../api/analysisApi.js';

// Monkeypatch attachShadow to style elements inside the closed shadow DOM of gmp-place-autocomplete on mobile.
if (typeof window !== 'undefined' && typeof Element !== 'undefined' && !Element.prototype.__attachShadow) {
  Element.prototype.__attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const shadow = this.__attachShadow(init);
    if (this.localName === 'gmp-place-autocomplete') {
      const style = document.createElement('style');
      style.textContent = `
        @media (max-width: 768px) {
          /* Style the input ONLY inside the mobile overlay dialog */
          dialog input, .dialog input, [open] input {
            margin-top: 24px !important;
            width: calc(100% - 92px) !important;
            max-width: calc(100% - 92px) !important;
            margin-left: 8px !important;
            margin-right: 12px !important;
            padding-left: 12px !important;
            padding-right: 32px !important;
            border-radius: 8px !important;
            height: 40px !important;
            min-height: 40px !important;
          }
          
          /* Style the back button ONLY inside the mobile overlay dialog */
          dialog button, dialog .back-button, dialog [aria-label="Back"], [open] button, [open] [aria-label="Back"] {
            margin-top: 24px !important;
            top: 24px !important;
          }
          
          /* Style the list ONLY inside the mobile overlay dialog to prevent overlap */
          dialog .prediction-list, dialog [part="prediction-list"], dialog ul, dialog [role="listbox"], [open] ul {
            margin-top: 24px !important;
          }
        }
      `;
      shadow.appendChild(style);
    }
    return shadow;
  };
}

const loadGoogleMapsScript = (apiKey) => {
  return new Promise((resolve, reject) => {
    // If Map constructor is already loaded, resolve immediately
    if (window.google && window.google.maps && window.google.maps.Map) {
      resolve(window.google.maps);
      return;
    }
    
    // Set up global callback
    window.__googleMapsCallback__ = () => {
      resolve(window.google.maps);
    };

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async&callback=__googleMapsCallback__`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    } else {
      // If script is already loading, wrap/chain the callback
      if (window.google && window.google.maps && window.google.maps.Map) {
        resolve(window.google.maps);
      } else {
        const oldCallback = window.__googleMapsCallback__;
        window.__googleMapsCallback__ = () => {
          if (oldCallback) {
            try { oldCallback(); } catch(e) {}
          }
          resolve(window.google.maps);
        };
      }
    }
  });
};

function MapPicker({ value, onChange }) {
  const [apiKey, setApiKey] = useState(null);
  const [mapId, setMapId] = useState('DEMO_MAP_ID');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [resolvedAddress, setResolvedAddress] = useState(value || '');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const mapRef = useRef(null);
  const autocompleteInstanceRef = useRef(null);
  const autocompleteContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const hasAutoDetectedRef = useRef(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Reusable geolocation detection function
  const detectLocation = useCallback((force = false) => {
    if (!mapsLoaded || !mapInstanceRef.current) return;
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // If not forced and user has already typed something in the input while we were waiting, don't overwrite it
        if (!force && autocompleteInstanceRef.current && autocompleteInstanceRef.current.value) {
          setIsLocating(false);
          return;
        }

        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: pos }, (results, status) => {
          setIsLocating(false);
          if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;
            
            // Double check that the user didn't type something during the geocoding request if not forced
            if (!force && autocompleteInstanceRef.current && autocompleteInstanceRef.current.value) {
              return;
            }

            const map = mapInstanceRef.current;
            if (markerRef.current) {
              markerRef.current.position = pos;
            } else {
              const pin = new window.google.maps.marker.PinElement({
                background: '#10b981',
                borderColor: '#ffffff',
                glyphColor: '#ffffff',
                scale: 1.2
              });
              markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                position: pos,
                map,
                content: pin
              });
            }
            map.panTo(pos);
            map.setZoom(15);

            setResolvedAddress(address);
            setInputValue(address);
            if (onChangeRef.current) {
              onChangeRef.current(address);
            }

            if (autocompleteInstanceRef.current) {
              autocompleteInstanceRef.current.value = address;
            }
          } else {
            console.error('Geocoder failed:', status);
            setLocationError('Could not resolve your coordinates to an address.');
          }
        });
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        let msg = 'Failed to detect location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access denied.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location info unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location detection timed out.';
        }
        setLocationError(msg);

        // Auto-clear error after 5 seconds to keep UI clean
        setTimeout(() => {
          setLocationError(null);
        }, 5000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [mapsLoaded]);

  // Load API key and Map ID from server config
  useEffect(() => {
    let active = true;
    async function loadConfig() {
      try {
        const data = await fetchConfig();
        if (active) {
          if (data?.googleMapsApiKey) {
            setApiKey(data.googleMapsApiKey);
          }
          if (data?.googleMapsMapId) {
            setMapId(data.googleMapsMapId);
          }
        }
      } catch (err) {
        console.error('Error fetching google maps config:', err);
      }
    }
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  // Sync external value
  useEffect(() => {
    if (value !== resolvedAddress) {
      setInputValue(value || '');
      setResolvedAddress(value || '');
      if (autocompleteInstanceRef.current) {
        autocompleteInstanceRef.current.value = value || '';
      }
    }
  }, [value, resolvedAddress]);

  // Load Google Maps script once API key is available
  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMapsScript(apiKey)
      .then(() => setMapsLoaded(true))
      .catch((err) => console.error('Failed to load Google Maps script:', err));
  }, [apiKey]);

  // Initialize Map and Place Autocomplete
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || !autocompleteContainerRef.current) return;

    // Default center (Downtown Austin, TX)
    const defaultCenter = { lat: 30.2672, lng: -97.7431 };

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      mapId: mapId
    });

    mapInstanceRef.current = map;

    // Initialize Autocomplete Web Component
    const autocomplete = new window.google.maps.places.PlaceAutocompleteElement({
      locationBias: map.getBounds()
    });

    // Configure Autocomplete Element
    autocomplete.placeholder = 'Search for a location or click on the map below...';
    autocomplete.value = inputValue || value || '';
    autocomplete.setAttribute('no-input-icon', '');
    autocomplete.setAttribute('no-clear-button', '');

    // Clear and append
    autocompleteContainerRef.current.innerHTML = '';
    autocompleteContainerRef.current.appendChild(autocomplete);
    autocompleteInstanceRef.current = autocomplete;

    // Keep locationBias updated with map bounds
    const boundsListener = map.addListener('bounds_changed', () => {
      autocomplete.locationBias = map.getBounds();
    });

    // Marker helper
    const updateMarker = (position, addressName) => {
      if (markerRef.current) {
        markerRef.current.position = position;
      } else {
        const pin = new window.google.maps.marker.PinElement({
          background: '#10b981',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          scale: 1.2
        });
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          content: pin
        });
      }
      map.panTo(position);
      map.setZoom(15);
      
      setResolvedAddress(addressName);
      setInputValue(addressName);
      if (onChangeRef.current) {
        onChangeRef.current(addressName);
      }

      autocomplete.value = addressName;
    };

    // Autocomplete Selection Change Event using 'gmp-select'
    const handleSelect = async (event) => {
      const placePrediction = event.placePrediction;
      if (!placePrediction) return;

      const place = placePrediction.toPlace();
      try {
        await place.fetchFields({
          fields: ['location', 'formattedAddress', 'displayName']
        });

        if (!place.location) return;

        setLocationError(null);
        const position = place.location;
        const address = place.formattedAddress || place.displayName;
        updateMarker(position, address);
      } catch (err) {
        console.error('Error fetching place details:', err);
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    // Map Click Event to pinpoint spot
    const clickListener = map.addListener('click', (event) => {
      const position = event.latLng;
      const geocoder = new window.google.maps.Geocoder();
      setLocationError(null);

      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const address = results[0].formatted_address;
          updateMarker(position, address);
        } else {
          console.warn('Geocoder failed due to:', status);
        }
      });
    });

    // Initialize marker if value is already present (geocode it to center map)
    if (value) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: value }, (results, status) => {
        if (status === 'OK' && results[0]?.geometry?.location) {
          const position = results[0].geometry.location;
          map.setCenter(position);
          
          const pin = new window.google.maps.marker.PinElement({
            background: '#10b981',
            borderColor: '#ffffff',
            glyphColor: '#ffffff',
            scale: 1.2
          });
          markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            position,
            map,
            content: pin
          });
        }
      });
    } else {
      // Auto-detect user's location on initial load if no value is set
      if (navigator.geolocation && !hasAutoDetectedRef.current) {
        hasAutoDetectedRef.current = true;
        detectLocation(false);
      }
    }

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      if (window.google && window.google.maps) {
        window.google.maps.event.removeListener(boundsListener);
        window.google.maps.event.removeListener(clickListener);
      }
      autocompleteInstanceRef.current = null;
    };
  }, [mapsLoaded, mapId, detectLocation]);

  return (
    <div className="map-picker-wrapper">
      <div className="map-search-container">
        <div className="map-search-left-icon">
          <MapPin size={16} aria-hidden="true" />
        </div>
        {mapsLoaded ? (
          <div ref={autocompleteContainerRef} className="map-autocomplete-container" style={{ width: '100%' }} />
        ) : (
          <input
            type="text"
            className="map-fallback-input"
            value={inputValue}
            disabled
            placeholder="Loading Google Maps..."
          />
        )}
        <div className="map-search-right-actions">
          <button
            type="button"
            className={`map-locate-btn ${isLocating ? 'locating' : ''}`}
            onClick={() => detectLocation(true)}
            title="Detect my current location"
            aria-label="Detect my current location"
            disabled={isLocating || !mapsLoaded}
          >
            <Locate size={16} />
          </button>
          <Search className="map-search-end-icon" size={16} aria-hidden="true" />
        </div>
      </div>

      <div className="map-container-outer">
        <div ref={mapRef} className="map-canvas" />
        {!apiKey && <div className="map-overlay-loading">Loading configuration...</div>}
        {apiKey && !mapsLoaded && <div className="map-overlay-loading">Loading Google Maps...</div>}
      </div>

      {isLocating && (
        <div className="map-resolved-address status-locating">
          <span className="bullet pulsing" />
          Detecting your location...
        </div>
      )}
      {!isLocating && locationError && (
        <div className="map-resolved-address status-error">
          <span className="bullet error" />
          Error: <strong style={{ color: 'var(--red)' }}>{locationError}</strong>
        </div>
      )}
      {!isLocating && !locationError && resolvedAddress && (
        <div className="map-resolved-address">
          <span className="bullet" />
          Selected: <strong>{resolvedAddress}</strong>
        </div>
      )}
    </div>
  );
}

export default MapPicker;
