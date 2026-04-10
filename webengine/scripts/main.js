// Callback when Google Maps API is loaded
window.onGoogleMapsLoaded = function () {
  // Initialize map functionality
  const mapContainer = document.querySelector('.goggle-map');
  const mapEventContainer = document.querySelector('.event__map');
  if (mapContainer) {
    window
      .initAutocomplete()
      .then(() => {
        // Map is now initialized
        if (typeof window.onMapReady === 'function') {
          window.onMapReady(window.map);
        }

        // Dispatch a custom event
        window.dispatchEvent(new CustomEvent('mapReady', { detail: { map: window.map } }));

        // Initialize location finder if available
        if (typeof window.initLocationFinder === 'function') {
          window.initLocationFinder();
        }
        // createStateMarkerClusters(window.locationDatas, window.map);
      })
      .catch((error) => {
        console.error('Error initializing map:', error);
      });
  }
  if (mapEventContainer) {
    window.eventMap();
  }
};

// Load Google Maps API
function loadGoogleMapsAPI() {
  const script = document.createElement('script');
  let apiKey = '';
  switch (cookieManager.get(cookieKeys.tealiumprofile)) {
    case 'easternterritory':
      apiKey = 'AIzaSyBbDPRYs_8-jC4yMXlFhHgzs-L8sKE1DQg';
      break;
    case 'centralterritory':
      apiKey = 'AIzaSyB7OZh7TT1Tdw1QgEaeoAa21ygI7woeJ8Y';
      break;
    case 'westernterritory':
      apiKey = 'AIzaSyD_rheB8XGZMGo6GQBjCGOjkUSIef4zo4g';
      break;
    case 'southernterritory':
      apiKey = 'AIzaSyDoUdPepg4tD2w4dqr4akWNQhp-i9edQCc';
      break;

    default:
      apiKey = 'AIzaSyCDt9Xkd1uzYFlMuauhWdZW4XWCmYcA3mU';
      break;
  }
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&callback=onGoogleMapsLoaded`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function dateFormatter(date) {
  if (!date) return;

  const [year, month, day] = date.split('-');
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const monthName = monthNames[parseInt(month, 10) - 1];
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
}

function addressBuilder(address = '', city = '', state = '', zipcode = '') {
  let addressArr = [address, city, state, zipcode];
  let filteredAddressInfo = addressArr.filter((item) => item !== '' && item !== null);
  const fullAddress = filteredAddressInfo.join(', ');
  return fullAddress;
}

function convertHtmlEntities(text) {
  // Create a temporary element
  const tempElement = document.createElement('div');

  // Set the innerHTML to the text with HTML entities
  tempElement.innerHTML = text;

  // Return the decoded text
  return tempElement.textContent;
}

const createStateBasedClusters = (locations, map, preserveZoom = true) => {
  const initialZoom = preserveZoom ? map.getZoom() : null;

  // Group locations by state
  const stateGroups = {};

  // Group locations by state
  locations.forEach((location) => {
    if (
      !location.latitude ||
      !location.longitude ||
      (parseFloat(location.latitude) === 0 && parseFloat(location.longitude) === 0)
    ) {
      return; // Skip invalid locations
    }

    const state = location.state || 'Unknown';

    if (!stateGroups[state]) {
      stateGroups[state] = [];
    }

    stateGroups[state].push(location);
  });

  // Create individual markers for all locations
  let allMarkers = [];

  Object.entries(stateGroups).forEach(([state, stateLocations]) => {
    // Create individual markers with custom properties
    stateLocations.forEach((location, index) => {
      const position = {
        lat: parseFloat(location.latitude),
        lng: parseFloat(location.longitude)
      };
      const customIcon = {
        url: 'https://8hxvw8tw.media.zestyio.com/location_filled50.png',
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(15, 40),
        scaledSize: new google.maps.Size(40, 40)
      };

      const selectedIcon = {
        url: 'https://8hxvw8tw.media.zestyio.com/location_filled.png',
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(15, 40),
        scaledSize: new google.maps.Size(40, 40)
      };
      const marker = new google.maps.Marker({
        position,
        map: map,
        icon: customIcon,
        title: location.name,
        selectedIcon: selectedIcon, // Store selected icon
        defaultIcon: customIcon, // Store default icon
        // Store state info for clustering
        customData: {
          state: state,
          location: location
        },
        locationData: {
          resultIndex: (index + 1).toString(),
          zuid: location.zuid || '',
          name: convertHtmlEntities(location.name) || '',
          organization_details: `SAL^${location.territory || ''}^${location.division || ''}^${
            location.corps || ''
          }`,
          services: location.services ? location.services.map((s) => s.title).join(',') : '',
          address:
            addressBuilder(location.address, location.city.title, location.state.state_code) || '',
          contact_number: location.contact_number || '',
          hours_of_operation: location.hours_of_operation || '',
          url: window.location.origin + (location.url || '')
        }
      });
      let infoWindow = new google.maps.InfoWindow();
      // Add click listener to marker
      const markerClickListener = marker.addListener('click', () => {
        // Deselect previously selected marker if exists
        if (window.selectedMarker && window.selectedMarker !== marker) {
          window.selectedMarker.setIcon(window.selectedMarker.defaultIcon);
        }

        // Toggle selection of current marker
        if (window.selectedMarker === marker) {
          marker.setIcon(marker.defaultIcon);
          window.selectedMarker = null;
          // Close the info window when deselecting
          infoWindow.close();
        } else {
          marker.setIcon(marker.selectedIcon);
          window.selectedMarker = marker;

          infoWindowContent = `<div style="width: 75%;">
            <h6 class="display-1">${marker.locationData.name}</h6>
            <p class="mb-0 display-2 d-flex"><span class="material-symbols-outlined me-2">location_on</span>${marker.locationData.address}</p>
            <p class="mb-0 display-2 d-flex"><span class="material-symbols-outlined me-2">call</span>${marker.locationData.contact_number}</p>
          </div>`;
          infoWindow.setContent(infoWindowContent);
          infoWindow.open(window.map, marker);
        }

        infoWindow.addListener('closeclick', () => {
          if (window.selectedMarker) {
            window.selectedMarker.setIcon(window.selectedMarker.defaultIcon);
            window.selectedMarker = null;
          }
        });

        // Center and zoom the map on the clicked marker
        window.map.setCenter(marker.getPosition());
        window.map.setZoom(15);

        // Track the marker click
        LocationTrackingMapClickEvent(marker.locationData, '');

        // Call handlePinClick to highlight associated card
        if (typeof window.handlePinClick === 'function') {
          window.handlePinClick(marker.locationData.zuid);
        }

        // Dispatch marker clicked event with the marker data
        const event = new CustomEvent('markerClicked', {
          detail: marker.locationData
        });
        handleMarkerContent(event.detail);
        document.dispatchEvent(event);
      });
      // marker.markerClickedListener = markerClickedListener;
      marker.markerClickListener = markerClickListener;
      allMarkers.push(marker);
    });
  });

  // Create a custom clusterer
  const markerCluster = new markerClusterer.MarkerClusterer({
    map,
    markers: allMarkers,
    algorithm: new markerClusterer.SuperClusterAlgorithm({
      // Custom cluster function that groups by state
      maxZoom: 16, // At this zoom level and beyond, no clustering
      radius: 150, // Distance between points to be clustered together

      // This is where the magic happens - custom distance function to cluster by state
      // Points in different states will have infinite distance, never clustering together
      distanceFn: (a, b) => {
        const markerA = allMarkers[a.index];
        const markerB = allMarkers[b.index];

        // If states don't match, return "infinite" distance so they don't cluster
        if (markerA.customData.state !== markerB.customData.state) {
          return Infinity;
        }

        // For same state, use normal distance calculation
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
      }
    }),
    // Add this section to prevent the default zoom-on-click behavior
    onClusterClick: (event, cluster, map) => {
      // Do nothing, effectively disabling the zoom action
      // You could add custom behavior here if needed
      return true; // Prevents default behavior
    },
    renderer: {
      render: ({ count, position }) => {
        // Find the state for this cluster by examining one of its markers
        let clusterState = 'Unknown';

        // Find a marker close to this position to get its state
        for (const marker of allMarkers) {
          const markerPosition = marker.getPosition();
          const dx = markerPosition.lat() - position.lat;
          const dy = markerPosition.lng() - position.lng;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.01) {
            // Very close markers
            clusterState = marker.customData.state;
            break;
          }
        }

        // Create the cluster marker
        return new google.maps.Marker({
          position,
          label: {
            text: String(count),
            color: 'white'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#002056', // Single color as requested
            fillOpacity: 1,
            scale: Math.max(22, 18 + Math.log(count) * 3),
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          },
          title: `${clusterState}: ${count} locations`,
          zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          cursor: 'default'
        });
      }
    }
  });

  // Calculate bounds to fit all markers
  const bounds = new google.maps.LatLngBounds();
  allMarkers.forEach((marker) => {
    bounds.extend(marker.getPosition());
  });
  let mapIdleListener;
  // CHANGED CONDITION: Only fit bounds if we have valid markers AND not preserving zoom
  if (!bounds.isEmpty() && !preserveZoom) {
    map.fitBounds(bounds, 50);
  } else if (initialZoom !== null) {
    // NEW SECTION: Restore the initial zoom level
    mapIdleListener = google.maps.event.addListenerOnce(map, 'idle', function () {
      map.setZoom(initialZoom);
    });
  }

  // Add a cleanup function to remove clusters and markers
  const cleanupClusters = () => {
    // Remove the marker clusterer from the map
    markerCluster.setMap(null);

    // Remove all individual markers from the map
    allMarkers.forEach((marker) => {
      // Remove the marker click listener if it exists
      if (marker.markerClickListener) {
        google.maps.event.removeListener(marker.markerClickListener);
      }
      // if (marker.markerClickedListener) {
      //   google.maps.event.removeListener(marker.markerClickedListener);
      // }
      marker.setMap(null);
    });
    // Clear the allMarkers array
    allMarkers = []; // Important: clear the array so old markers aren't reused
    // Remove the idle listener if it exists
    if (mapIdleListener) {
      google.maps.event.removeListener(mapIdleListener);
      mapIdleListener = null; // Clear the reference
    }
  };

  return {
    stateGroups,
    markers: allMarkers,
    markerCluster,
    cleanupClusters
  };
};

// Updated initialization function
const initMapWithStateClusters = (map, locations, preserveZoom = true) => {
  // Filter out invalid locations (0,0 coordinates)
  const validLocations = locations.filter(
    (loc) =>
      loc.latitude &&
      loc.longitude &&
      !(parseFloat(loc.latitude) === 0 && parseFloat(loc.longitude) === 0)
  );

  // Find initial map center
  const mapCenter =
    validLocations.length > 0
      ? {
          lat: parseFloat(validLocations[0].latitude),
          lng: parseFloat(validLocations[0].longitude)
        }
      : { lat: 39.8283, lng: -98.5795 }; // Center of USA

  // Use createStateBasedClusters
  const clusterData = createStateBasedClusters(locations, map, preserveZoom);

  return {
    map,
    ...clusterData
  };
};

/**
 * Calculate center point of state based on all locations
 * @param {Array} locations - Array of locations in the state
 * @returns {Object} - LatLng object representing center
 */
const calculateStateCenter = (locations) => {
  const validLocations = locations.filter(
    (loc) =>
      loc.latitude &&
      loc.longitude &&
      !isNaN(parseFloat(loc.latitude)) &&
      !isNaN(parseFloat(loc.longitude))
  );

  if (validLocations.length === 0) {
    return null;
  }

  const totalLat = validLocations.reduce((sum, loc) => sum + parseFloat(loc.latitude), 0);
  const totalLng = validLocations.reduce((sum, loc) => sum + parseFloat(loc.longitude), 0);

  return {
    lat: totalLat / validLocations.length,
    lng: totalLng / validLocations.length
  };
};

function applyTitleCase() {
  document.querySelectorAll('.text-title-case').forEach((element) => {
    const text = element.textContent;
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      if (words[i].length > 0) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
      }
    }

    element.textContent = words.join(' ');
  });
}

function stripos(haystack, needle, offset = 0) {
  if (typeof haystack !== 'string' || typeof needle !== 'string') {
    return false;
  }

  if (needle === '') {
    return false;
  }

  const position = haystack.toLowerCase().indexOf(needle.toLowerCase(), offset);
  return position === -1 ? false : true;
}

document.addEventListener('DOMContentLoaded', function () {
  // Toggle subcategory lists
  document.querySelectorAll('.btn-category').forEach((btn) => {
    btn.addEventListener('click', function () {
      const target = this.dataset.target;
      document.querySelectorAll('.subcategory-list').forEach((list) => {
        if (list.id !== target) {
          list.style.display = 'none';
        }
      });
      const targetList = document.getElementById(target);
      targetList.style.display = targetList.style.display === 'none' ? 'block' : 'none';
    });
  });

  // Handle return buttons
  document.querySelectorAll('.return-btn').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      this.closest('.subcategory-list').style.display = 'none';
    });
  });
  // wysiwygTracking();
  // loadGoogleMapsAPI();
  applyTitleCase();
});
