
// Function to reset the map to original state
function resetMap() {
  // Reset the map to original zoom and center
  if (window.map) {
    const searchInput = 
      document.getElementById('pac-input') || 
      document.getElementById('pac-input-mobile') ||
      document.getElementById('location-finder__input');
    
    // If there's a search term, keep the center at the searched location but reset the zoom
    if (searchInput && searchInput.value) {
      // Keep current center but reset zoom level to show more context
      window.map.setZoom(11); // Zoom level that shows city/area context
    } else {
      // If no search has been performed, reset to continental US
      window.map.setCenter({ lat: 39.9264073165157, lng: -102.03464803432597 });
      window.map.setZoom(4);
    }
    
    // Deselect the currently selected marker if exists
    if (window.selectedMarker) {
      // Reset the marker icon to default
      window.selectedMarker.setIcon(window.selectedMarker.defaultIcon);
      window.selectedMarker = null;
      
      // Clear any displayed location details
      const contentWrapper = document.querySelector('.map-content-wrapper');
      if (contentWrapper) {
        // Remove existing location-detail div if it exists
        const existingLocationDetail = contentWrapper.querySelector('.location-detail');
        if (existingLocationDetail) {
          existingLocationDetail.remove();
        }
        
        // Show initial content if it exists
        const initialContent = document.querySelector('.map-init-content');
        if (initialContent) {
          initialContent.classList.remove('d-none');
        }
      }
    }
    const resetButton = document.getElementById('map__reset');
    resetButton.classList.add('d-none');
  }
}

// Lazy-load Google Maps only when a map enters the viewport
function requestGoogleMapsAPI() {
  if (window.__mapsRequested) return;

  const tryLoad = (attempt = 0) => {
    if (window.__mapsRequested) return;
    if (typeof loadGoogleMapsAPI === 'function') {
      window.__mapsRequested = true;
      loadGoogleMapsAPI();
      return;
    }
    if (attempt < 30) {
      setTimeout(() => tryLoad(attempt + 1), 100);
    }
  };

  tryLoad();
}

function setupLazyMapLoading() {
  const mapTargets = document.querySelectorAll('.goggle-map, .event__map');
  if (!mapTargets.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          requestGoogleMapsAPI();
        }
      },
      { rootMargin: '200px 0px' }
    );

    mapTargets.forEach((target) => observer.observe(target));
  } else {
    requestGoogleMapsAPI();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLazyMapLoading, { once: true });
} else {
  setupLazyMapLoading();
}

const mapStyle = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      {
        color: '#e9e9e9'
      },
      {
        lightness: 17
      }
    ]
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [
      {
        color: '#f5f5f5'
      },
      {
        lightness: 20
      }
    ]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [
      {
        color: '#ffffff'
      },
      {
        lightness: 17
      }
    ]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [
      {
        color: '#ffffff'
      },
      {
        lightness: 29
      },
      {
        weight: 0.2
      }
    ]
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [
      {
        color: '#ffffff'
      },
      {
        lightness: 18
      }
    ]
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [
      {
        color: '#ffffff'
      },
      {
        lightness: 16
      }
    ]
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [
      {
        color: '#f5f5f5'
      },
      {
        lightness: 21
      }
    ]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      {
        color: '#dedede'
      },
      {
        lightness: 21
      }
    ]
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [
      {
        visibility: 'on'
      },
      {
        color: '#ffffff'
      },
      {
        lightness: 16
      }
    ]
  },
  {
    elementType: 'labels.text.fill',
    stylers: [
      {
        saturation: 36
      },
      {
        color: '#333333'
      },
      {
        lightness: 40
      }
    ]
  },
  {
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [
      {
        color: '#f2f2f2'
      },
      {
        lightness: 19
      }
    ]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.fill',
    stylers: [
      {
        color: '#fefefe'
      },
      {
        lightness: 20
      }
    ]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [
      {
        color: '#fefefe'
      },
      {
        lightness: 17
      },
      {
        weight: 1.2
      }
    ]
  }
];

// Make map globally available
window.map = null;
// Make map-related objects globally available
window.markers = [];
window.geocoder = null;
let locationMarkers = []; // Array to store location markers from JSON
let locationData = []; // Store the full location data
let mapInitialized = false;

// Function to handle marker click and update content
function handleMarkerContent(markerData) {
  const contentWrapper = document.querySelector('.map-content-wrapper');
  const searchData = window.searchInfoData;
  const resetButton = document.getElementById('map__reset');
  resetButton.classList.remove('d-none');
  if (!contentWrapper) return;

  // Remove existing location-detail div if it exists
  const existingLocationDetail = contentWrapper.querySelector('.location-detail');
  if (existingLocationDetail) {
    existingLocationDetail.remove();
  }

  // Build HTML content from marker data
  const html = `
        <div class="location-detail d-flex flex-column gap-4 justify-content-between h-100">
        <h4 class="fw-normal">${markerData.name}</h4>

        <div class="mb-auto">
          ${
            markerData.hours_of_operation &&
            `<div class="border-top border-2 border-dark-50 d-flex align-items-center justify-content-between py-3">
                <span class="fs-lg-7 display-4 fw-normal"> General Hours </span>
                <div class="text-dark-50 ms-auto me-2 fs-lg-7 display-4 fw-normal form-control text-end">
                  <span>${markerData.hours_of_operation}</span>
                </div>
              </div>`
          }
            <div
            class="border-top border-2 border-dark-50 d-flex align-items-center justify-content-between py-3"
            >
            <span class="fs-lg-7 display-4 fw-normal"> Phone </span>
            <div class="text-dark-50 fs-lg-7 display-4 fw-normal">
                <a 
                    href="tel:${markerData.contact_number}"
                    data-link-location-type="body:map"
                    data-link-function-type="navigation"
                    data-link-format-type="button"
                    data-link-type="internal"
                    data-search-term-type
                    data-location-id="${markerData.zuid}"
                    data-location-name="${markerData.name}"
                    data-location-org-detail="${markerData.organization_details}"
                    data-location-services="${markerData.services}"
                    data-location-search-term="${searchData.searchTerm}"
                    data-location-search-results="${searchData.totalResults}"
                    data-location-search-type="location search - body"
                    data-location-search-method="${searchData.searchMethod}"
                    data-location-search-result-index="${markerData.resultIndex}"
                    onclick="LocationTrackingResultsClickEvent(this)"
                >${markerData.contact_number}</a>
            </div>
            </div>
            <div
            class="border-top border-2 border-dark-50 d-flex align-items-center justify-content-between py-3"
            >
            <span class="fs-lg-7 display-4 fw-normal"> Address </span>
                <div  class="text-dark-50 fs-lg-7 display-4 fw-normal w-75 text-end">
                    <a 
                        href="https://www.google.com/maps?q=${markerData.address}" 
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fs-lg-7 display-4 text-dark-50"
                        data-link-location-type="body:map"
                        data-link-function-type="other"
                        data-link-format-type="button"
                        data-link-type="internal"
                        data-location-id="${markerData.zuid}"
                        data-location-name="${markerData.name}"
                        data-location-org-detail="${markerData.organization_details}"
                        data-location-services="${markerData.services}"
                        data-location-search-term="${searchData.searchTerm}"
                        data-location-search-results="${searchData.totalResults}"
                        data-location-search-type="location search - body"
                        data-location-search-method="${searchData.searchMethod}"
                        data-location-search-result-index="${markerData.resultIndex}"
                        onclick="LocationTrackingResultsClickEvent(this)"
                    >
                        <span class="text-dark-50 text-decoration-none">${markerData.address}</span>
                    </a>
                </div>
            </div>
            <div
            class="border-top border-2 border-dark-50 d-flex align-items-center justify-content-between py-3"
            >
            <span class="fs-lg-7 display-4 fw-normal"> Directions </span>
                <div class="text-dark-50 fs-lg-7 display-4 fw-normal">
                    <a
                        href="https://www.google.com/maps/dir/?api=1&origin=current-location&destination=${
                          markerData.address
                        }&travelmode=walking"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-dark-50 me-2"
                        data-link-location-type="body:map"
                        data-link-function-type="other"
                        data-link-format-type="button"
                        data-link-type="external"
                        data-location-id="${markerData.zuid}"
                        data-location-name="${markerData.name}"
                        data-location-org-detail="${markerData.organization_details}"
                        data-location-services="${markerData.services}"
                        data-location-search-term="${searchData.searchTerm}"
                        data-location-search-results="${searchData.totalResults}"
                        data-location-search-type="location search - body"
                        data-location-search-method="${searchData.searchMethod}"
                        data-location-search-result-index="${markerData.resultIndex}"
                        onclick="LocationTrackingResultsClickEvent(this)"
                    >Walking</a>
                    <a
                        href="https://www.google.com/maps/dir/?api=1&origin=current-location&destination=${
                          markerData.address
                        }&travelmode=driving"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-dark-50 me-2"
                        data-link-location-type="body:map"
                        data-link-function-type="other"
                        data-link-format-type="button"
                        data-link-type="external"
                        data-location-id="${markerData.zuid}"
                        data-location-name="${markerData.name}"
                        data-location-org-detail="${markerData.organization_details}"
                        data-location-services="${markerData.services}"
                        data-location-search-term="${searchData.searchTerm}"
                        data-location-search-results="${searchData.totalResults}"
                        data-location-search-type="location search - body"
                        data-location-search-method="${searchData.searchMethod}"
                        data-location-search-result-index="${markerData.resultIndex}"
                        onclick="LocationTrackingResultsClickEvent(this)"
                    >Driving</a>
                    <a
                        href="https://www.google.com/maps/dir/?api=1&origin=current-location&destination=${
                          markerData.address
                        }&travelmode=transit"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-dark-50"
                        data-link-location-type="body:map"
                        data-link-function-type="other"
                        data-link-format-type="button"
                        data-link-type="external"
                        data-location-id="${markerData.zuid}"
                        data-location-name="${markerData.name}"
                        data-location-org-detail="${markerData.organization_details}"
                        data-location-services="${markerData.services}"
                        data-location-search-term="${searchData.searchTerm}"
                        data-location-search-results="${searchData.totalResults}"
                        data-location-search-type="location search - body"
                        data-location-search-method="${searchData.searchMethod}"
                        data-location-search-result-index="${markerData.resultIndex}"
                        onclick="LocationTrackingResultsClickEvent(this)"
                    >Public Transport</a>
                </div>
            </div>
            <div
            class="border-top border-bottom border-2 border-dark-50 d-flex align-items-center justify-content-between py-3"
            >
            <div class="accordion w-100" id="servicesAccordion">
                <div class="accordion-item border-0">
                  <h2 class="accordion-header" id="servicesHeading">
                    <button
                      aria-expanded="false"
                      aria-controls="servicesCollapse"
                      class="accordion-button collapsed p-0 bg-transparent shadow-none"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#servicesCollapse"
                      data-location-type="body:location-results"
                      data-function-type="other"
                      data-format-type="icon-block"
                      data-page-componentType-type="location-results component"
                      data-page-componentHeading-type=""
                      data-page-componentSubheading-type=""
                      data-page-componentIndex-type=""
                      onclick="LinkTrackingClickEvent(this,'view_content_click')" 
                    >
                      <div class="d-flex align-items-center justify-content-between w-100">
                        <span class="display-md-1 display-4">Services Offered</span>
                        <span class="text-dark-50 text-decoration-none display-md-1 display-4 me-1">View More</span>
                      </div>
                    </button>
                  </h2>
                  <div id="servicesCollapse" class="accordion-collapse collapse" aria-labelledby="servicesHeading" data-bs-parent="#servicesAccordion">
                    <div class="accordion-body p-0 pt-3">
                      <div class="row row-cols-2 row-cols-md-3 g-3" id="services-container">
                        Loading services...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <div class="d-flex gap-2">
            <a 
              href="${markerData.url}"
              class="btn btn-info d-flex align-items-center justify-content-center d-sm-none d-lg-flex"
              data-link-location-type="body:map"
              data-link-function-type="other"
              data-link-format-type="button"
              data-link-type="external"
              data-location-id="${markerData.zuid}"
              data-location-name="${markerData.name}"
              data-location-org-detail="${markerData.organization_details}"
              data-location-services="${markerData.services}"
              data-location-search-term="${searchData.searchTerm}"
              data-location-search-results="${searchData.totalResults}"
              data-location-search-type="location search - body"
              data-location-search-method="${searchData.searchMethod}"
              data-location-search-result-index="${markerData.resultIndex}"
              onclick="LocationTrackingResultsClickEvent(this)"
            >
            <span class="material-symbols-outlined text-light"> arrow_outward </span>
            View Location
            </a>
            <button class="btn btn-secondary d-flex align-items-center justify-content-center d-none">
            <span class="material-symbols-outlined text-light"> arrow_outward </span>
            Service Hours & Info
            </button>
        </div>
        </div>
    `;
  // Make fetchServicesForMapLocation available globally
  window.fetchServicesForMapLocation = async function (zuid) {
    try {
      const response = await fetch(`${window.location.origin}/services.json?location=${zuid}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const rawData = await response.text();
      const data = JSON.parse(rawData);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error checking location:', error);
      return [];
    }
  };

  // Load services asynchronously
  window
    .fetchServicesForMapLocation(markerData.zuid)
    .then((services) => {
      const servicesContainer = document.getElementById(`services-container`);
      if (servicesContainer && services && Array.isArray(services)) {
        servicesContainer.innerHTML = services
          .map(
            (service) => `
            <div class="col">
              <div class="d-flex align-items-start">
                <span class="material-symbols-outlined text-primary-200 display-6">${service.service_page_icon}</span>
                <a href="${service.meta.web.url}" class="display-4 text-dark-100 display-md-1 ms-2">${service.title}</a>
              </div>
            </div>
          `
          )
          .join('');
      } else if (servicesContainer) {
        servicesContainer.innerHTML = 'No services available';
      }
    })
    .catch((error) => {
      console.error('Error loading services:', error);
      const servicesContainer = document.getElementById(`services-container-${index}`);
      if (servicesContainer) {
        servicesContainer.innerHTML = 'Error loading services';
      }
    });

  // Find existing location info and remove it
  let locationInfo = contentWrapper.querySelector('.location-info');
  if (locationInfo) {
    locationInfo.remove();
  }
  const initialContent = document.querySelector('.map-init-content');
  if (initialContent) {
    initialContent.classList.add('d-none');
  }
  // Prepend the new content before the existing content
  contentWrapper.insertAdjacentHTML('afterbegin', html);
}

// Add event listener for marker clicks
document.addEventListener('markerClicked', (event) => {
  handleMarkerContent(event.detail);
});

async function fetchLocationData() {
  try {
    // Show loader
    const loader = document.querySelector('.map-loader');
    if (loader) {
      loader.classList.remove('d-none');
    }
    // const response = await fetch(`${window.location.origin}/-/gql/locations.json`);
    const response = await fetch(`${window.location.origin}/locations.json?_bypassError=true`);
    const rawData = await response.text();

    let data;
    try {
      data = JSON.parse(rawData);
      window.locationDatas = data;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Failed to parse location data');
    }

    if (!Array.isArray(data)) {
      throw new Error('Location data is not in the expected format');
    }

    return data;
  } catch (error) {
    console.error('Error fetching location data:', error);
    return [];
  } finally {
    // Hide loader
    const loader = document.querySelector('.map-loader');
    if (loader) {
      loader.classList.add('d-none');
    }
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const p1 = new google.maps.LatLng(lat1, lon1);
  const p2 = new google.maps.LatLng(lat2, lon2);
  // Returns distance in meters, convert to miles
  return google.maps.geometry.spherical.computeDistanceBetween(p1, p2) * 0.000621371;
}

// Helper function to geocode an address
function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    if (!window.geocoder) {
      reject(new Error('Geocoder not initialized'));
      return;
    }

    window.geocoder.geocode(
      {
        address: address,
        componentRestrictions: { country: 'US' }
      },
      (results, status) => {
        if (status === 'OK' && results.length > 0) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          reject(new Error(`Geocoding failed for address: ${address}`));
        }
      }
    );
  });
}

async function displayLocationMarkers(searchLocation) {
  try {
    const searchInput =
      document.getElementById('pac-input') ||
      document.getElementById('pac-input-mobile') ||
      document.getElementById('location-finder__input');
    // Show loader
    const loader = document.querySelector('.map-loader');
    if (loader) {
      loader.classList.remove('d-none');
    }

    // Clear existing location markers
    locationMarkers.forEach((marker) => marker.setMap(null));
    locationMarkers = [];

    // If we haven't loaded the location data yet, load it
    if (window.locationDatas.length === 0) {
      await fetchLocationData();
    }

    // Custom marker icons - default and selected states
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

    // Separate locations into those with coordinates and those needing geocoding
    const locationsWithCoords = [];
    const locationsNeedingGeocoding = [];

    window.locationDatas.forEach((location) => {
      if (location.latitude && location.longitude) {
        locationsWithCoords.push(location);
      } else if (location.address) {
        locationsNeedingGeocoding.push(location);
      }
    });

    const searchLat =
      typeof searchLocation.lat === 'function' ? searchLocation.lat() : searchLocation.lat;
    const searchLng =
      typeof searchLocation.lng === 'function' ? searchLocation.lng() : searchLocation.lng;

    // Process locations with coordinates
    const filteredLocations = locationsWithCoords.filter((location) => {
      const distance = calculateDistance(
        searchLat,
        searchLng,
        location.latitude,
        location.longitude
      );
      return distance <= 50; // 50 miles radius
    });

    // Process locations needing geocoding
    for (const location of locationsNeedingGeocoding) {
      try {
        const coords = await geocodeAddress(location.address);
        const distance = calculateDistance(
          searchLocation.lat(),
          searchLocation.lng(),
          coords.lat,
          coords.lng
        );

        if (distance <= 50) {
          // Add geocoded coordinates to the location object
          location.latitude = coords.lat;
          location.longitude = coords.lng;
          filteredLocations.push(location);
        }
      } catch (error) {
        console.warn(`Failed to geocode address for location: ${location.name}`, error);
      }
    }

    // Get current search information

    const searchTerm = searchInput?.value || '';
    const hasFilters = document.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    const useMyLocationButton = document.querySelector('.use-my-location');
    const isGeolocation = useMyLocationButton
      ? useMyLocationButton.classList.contains('active')
      : false;

    let searchMethod = 'user-entered';
    if (hasFilters && isGeolocation) searchMethod = 'autofilled filters and location';
    else if (hasFilters) searchMethod = 'autofilled filters';
    else if (isGeolocation) searchMethod = 'autofilled location';

    // Get filter information
    const selectedFilters = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
    const filterType = selectedFilters.length ? 'Service Type' : '';
    const filterValue = selectedFilters.map((cb) => cb.value).join(', ');

    // Create search info object
    const searchInfo = {
      searchTerm: searchTerm,
      totalResults: filteredLocations.length,
      searchMethod: searchMethod,
      filterType: filterType,
      filterValue: filterValue
    };

    // Set global variable for Search Info
    window.searchInfoData = searchInfo;

    // Create markers for all filtered locations
    let zuids = [];
    filteredLocations.forEach((location, index) => {
      zuids.push(location.zuid);
      const position = {
        lat: parseFloat(location.latitude),
        lng: parseFloat(location.longitude)
      };

      // Validate position
      if (isNaN(position.lat) || isNaN(position.lng)) {
        console.error('Invalid position for location:', location);
        return;
      }

      const marker = new google.maps.Marker({
        position: position,
        map: window.map,
        icon: customIcon,
        title: convertHtmlEntities(location.name) || 'Salvation Army Location',
        selectedIcon: selectedIcon, // Store selected icon
        defaultIcon: customIcon, // Store default icon
        // label: {
        //   text: convertHtmlEntities(location.name) || 'Salvation Army Location',
        //   color: '#1C1B1F',
        //   fontSize: '18px',
        //   fontWeight: '400',
        //   className: 'marker-label'
        // }
      });
      
      // Store location data directly on the marker object

      let generalHours = '';
      if(stripos('Contact Store for hours', location.hours_of_operation)) {
        generalHours = 'Contact location for hours';
      } else if (stripos('Contact for hours', location.hours_of_operation)) {
        generalHours = 'Contact location for hours';
      } else {
        generalHours = location.hours_of_operation;
      }
      console.log('Locations Marker Data:', location)
      marker.locationData = {
        resultIndex: (index + 1).toString(),
        zuid: location.zuid || '',
        name: convertHtmlEntities(location.name) || '',
        organization_details: `SAL^${location.territory || ''}^${location.division || ''}^${
          location.corps || ''
        }`,
        services: location.services ? location.services.map((s) => s.title).join(',') : '',
        address:
          addressBuilder(location.address, location.city, location.state, location.zipcode) || '',
        contact_number: location.contact_number || '',
        hours_of_operation: generalHours || '',
        url: window.location.origin + (location.url || '')
      };

      // Add click listener to marker
      marker.addListener('click', () => {
        // Deselect previously selected marker if exists
        if (window.selectedMarker && window.selectedMarker !== marker) {
          window.selectedMarker.setIcon(window.selectedMarker.defaultIcon);
        }

        // Toggle selection of current marker
        if (window.selectedMarker === marker) {
          marker.setIcon(marker.defaultIcon);
          window.selectedMarker = null;
        } else {
          marker.setIcon(marker.selectedIcon);
          window.selectedMarker = marker;
        }

        // Center and zoom the map on the clicked marker
        window.map.setCenter(marker.getPosition());
        window.map.setZoom(15);

        // Track the marker click
        LocationTrackingMapClickEvent(marker.locationData, searchInfo);

        // Call handlePinClick to highlight associated card
        if (typeof window.handlePinClick === 'function') {
          window.handlePinClick(marker.locationData.zuid);
        }

        // Dispatch marker clicked event with the marker data
        const event = new CustomEvent('markerClicked', {
          detail: marker.locationData
        });
        document.dispatchEvent(event);
      });
      locationMarkers.push(marker);
    });
    if(searchTerm) {
        searchInput.setAttribute('data-filter-type-type', 'location search');
        searchInput.setAttribute('data-search-results-type', String(filteredLocations.length));
        LocationTrackingSearchEvent(searchInput, 'location_search');
    }
  } catch (error) {
    console.error('Error displaying location markers:', error);
  } finally {
    // Hide loader
    const loader = document.querySelector('.map-loader');
    if (loader) {
      loader.classList.add('d-none');
    }
  }
}
async function getAddressFromCoordinates(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();

    if (data && data.display_name) {
      const parts = [
        data.address.city || data.address.town || data.address.village,
        data.address.state,
        data.address.postcode
      ].filter(Boolean);
      return parts.join(', ');
    }
    throw new Error('No address found');
  } catch (error) {
    console.error('Error getting address:', error);
    throw error;
  }
}
// Make initAutocomplete globally available for the callback
window.initAutocomplete = async function () {
  window.map = new google.maps.Map(document.querySelector('.goggle-map'), {
    center: { lat: 39.9264073165157, lng: -102.03464803432597 },
    zoom: 4,
    mapTypeId: 'roadmap',
    fullscreenControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    styles: mapStyle
  });
  const googleMapContainer = document.querySelector('.goggle-map');
  const mapClass = [
    'location-finder__map',
    'map-info__map',
    'landing-page__map',
    'contact-form__map',
    'map-with-info-contact__map'
  ];

  //This checks if there are maps that uses the location data present on the page. 
  const hasAnyMapClass = mapClass.some(className => 
    googleMapContainer.classList.contains(className)
  );

  if (hasAnyMapClass) {
    // Initialize locations
    await fetchLocationData();
  }
  
  window.geocoder = new google.maps.Geocoder();
  mapInitialized = true;

  const isMapWithInfo = document.querySelector('#map-with-info .goggle-map') !== null;

  if (isMapWithInfo) {
    try {
      if (typeof window.getLocationAddress === 'function') {
        const address = await window.getLocationAddress();

        if (address) {
          
          const geocodeResult = await geocodeAddress(address);
          const location = new google.maps.LatLng(geocodeResult.lat, geocodeResult.lng);
          const customIcon = {
            url: 'https://8hxvw8tw.media.zestyio.com/location_filled50.png',
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(15, 40),
            scaledSize: new google.maps.Size(40, 40)
          };

          const marker = new google.maps.Marker({
            position: location,
            map: window.map,
            icon: customIcon,
            // title: convertHtmlEntities(location.name) || 'Salvation Army Location',
          });
          window.map.setCenter(location);
          window.map.setZoom(10);

          

          // displayLocationMarkers(location);
        }
      } else {
        console.error('getLocationAddress function is not available');
      }
    } catch (error) {
      console.error('Error setting initial map location:', error);
    }
  } else {
    // Get initial property address and center map
    try {
      if (typeof window.getProperty === 'function') {
        const address = await window.getProperty();
        if (address) {
          const geocodeResult = await geocodeAddress(address);
          const location = new google.maps.LatLng(geocodeResult.lat, geocodeResult.lng);
          window.map.setCenter(location);
          window.map.setZoom(12);
        }
      }
    } catch (error) {
      console.error('Error setting initial map location:', error);
    }

    // Get location address and center map
    try {
      if ((typeof window.getLocationAddress === 'function') ) {
        const address = await window.getLocationAddress();
        if (address) {
          const geocodeResult = await geocodeAddress(address);
          const location = new google.maps.LatLng(geocodeResult.lat, geocodeResult.lng);
          window.map.setCenter(location);
          window.map.setZoom(4);

          // displayLocationMarkers(location);
        }
      }
    } catch (error) {
      console.error('Error setting initial map location:', error);
    }
  }

  // Create the search box and link it to the UI element.
  const input = document.getElementById('pac-input');
  if (input) {
    // Create session token to group autocomplete requests (reduces API costs)
    let sessionToken = new google.maps.places.AutocompleteSessionToken();
    const autocompleteService = new google.maps.places.AutocompleteService();

    let debounceTimer;
    const debounceDelay = 300; // Wait 300ms after user stops typing

    // Create autocomplete dropdown container with enhanced styling
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-dropdown-container-map';
    autocompleteContainer.style.cssText = `
      position: absolute;
      z-index: 1050;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      max-height: 280px;
      overflow-y: auto;
      display: none;
      width: 100%;
      margin-top: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    // Add custom styles for this dropdown
    if (!document.getElementById('autocomplete-styles-map')) {
      const style = document.createElement('style');
      style.id = 'autocomplete-styles-map';
      style.textContent = `
        .autocomplete-dropdown-container-map::-webkit-scrollbar {
          width: 8px;
        }
        .autocomplete-dropdown-container-map::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .autocomplete-dropdown-container-map::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .autocomplete-dropdown-container-map::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        .autocomplete-item-map {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.15s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .autocomplete-item-map:last-child {
          border-bottom: none;
        }
        .autocomplete-item-map:hover {
          background-color: #f9fafb;
        }
        .autocomplete-item-map:active {
          background-color: #f3f4f6;
        }
        .autocomplete-icon-map {
          width: 18px;
          height: 18px;
          color: #6b7280;
          flex-shrink: 0;
        }
        .autocomplete-text-map {
          color: #1f2937;
          font-size: 14px;
          line-height: 1.5;
        }
      `;
      document.head.appendChild(style);
    }

    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(autocompleteContainer);

    input.addEventListener('input', function() {
      const value = this.value;

      clearTimeout(debounceTimer);

      if (value.length < 3) {
        autocompleteContainer.style.display = 'none';
        return;
      }

      // Debounce API call - only fire after user stops typing
      debounceTimer = setTimeout(() => {
        autocompleteService.getPlacePredictions({
          input: value,
          types: ['(regions)'],  // Regions type for city/ZIP searches (cheaper than geocode)
          componentRestrictions: { country: 'US' },
          sessionToken: sessionToken
        }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            autocompleteContainer.innerHTML = '';
            autocompleteContainer.style.display = 'block';

            predictions.forEach(prediction => {
              const item = document.createElement('div');
              item.className = 'autocomplete-item-map';
              item.innerHTML = `
                <svg class="autocomplete-icon-map" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="autocomplete-text-map">${prediction.description}</span>
              `;

              item.addEventListener('click', function() {
                input.value = prediction.description;
                autocompleteContainer.style.display = 'none';

                // Track the search before performing it
                input.setAttribute('data-location-search-term-type', prediction.description);
                input.setAttribute('data-location-search-type', 'location search - body');
                input.setAttribute('data-location-search-method-type', 'user-entered');

                // Create new session token for next search
                sessionToken = new google.maps.places.AutocompleteSessionToken();
              });
              autocompleteContainer.appendChild(item);
            });
          } else {
            autocompleteContainer.style.display = 'none';
          }
        });
      }, debounceDelay);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (e.target !== input && !autocompleteContainer.contains(e.target)) {
        autocompleteContainer.style.display = 'none';
      }
    });
  } else {
    console.warn('pac-input element not found')
  }
  

  // Mobile
  // Create the search box and link it to the UI element.
  const inputMobile = document.getElementById('pac-input-mobile');
  if (inputMobile) {
    // Create session token to group autocomplete requests (reduces API costs)
    let sessionTokenMobile = new google.maps.places.AutocompleteSessionToken();
    const autocompleteServiceMobile = new google.maps.places.AutocompleteService();

    let debounceTimerMobile;
    const debounceDelayMobile = 300; // Wait 300ms after user stops typing

    // Create autocomplete dropdown container with enhanced styling
    const autocompleteContainerMobile = document.createElement('div');
    autocompleteContainerMobile.className = 'autocomplete-dropdown-container-map-mobile';
    autocompleteContainerMobile.style.cssText = `
      position: absolute;
      z-index: 1050;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      max-height: 280px;
      overflow-y: auto;
      display: none;
      width: 100%;
      margin-top: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    // Add custom styles for mobile dropdown
    if (!document.getElementById('autocomplete-styles-map-mobile')) {
      const styleMobile = document.createElement('style');
      styleMobile.id = 'autocomplete-styles-map-mobile';
      styleMobile.textContent = `
        .autocomplete-dropdown-container-map-mobile::-webkit-scrollbar {
          width: 8px;
        }
        .autocomplete-dropdown-container-map-mobile::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .autocomplete-dropdown-container-map-mobile::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .autocomplete-dropdown-container-map-mobile::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        .autocomplete-item-map-mobile {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.15s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .autocomplete-item-map-mobile:last-child {
          border-bottom: none;
        }
        .autocomplete-item-map-mobile:hover {
          background-color: #f9fafb;
        }
        .autocomplete-item-map-mobile:active {
          background-color: #f3f4f6;
        }
        .autocomplete-icon-map-mobile {
          width: 18px;
          height: 18px;
          color: #6b7280;
          flex-shrink: 0;
        }
        .autocomplete-text-map-mobile {
          color: #1f2937;
          font-size: 14px;
          line-height: 1.5;
        }
      `;
      document.head.appendChild(styleMobile);
    }

    inputMobile.parentNode.style.position = 'relative';
    inputMobile.parentNode.appendChild(autocompleteContainerMobile);

    inputMobile.addEventListener('input', function() {
      const value = this.value;

      clearTimeout(debounceTimerMobile);

      if (value.length < 3) {
        autocompleteContainerMobile.style.display = 'none';
        return;
      }

      // Debounce API call - only fire after user stops typing
      debounceTimerMobile = setTimeout(() => {
        autocompleteServiceMobile.getPlacePredictions({
          input: value,
          types: ['(regions)'],  // Regions type for city/ZIP searches (cheaper than geocode)
          componentRestrictions: { country: 'US' },
          sessionToken: sessionTokenMobile
        }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            autocompleteContainerMobile.innerHTML = '';
            autocompleteContainerMobile.style.display = 'block';

            predictions.forEach(prediction => {
              const item = document.createElement('div');
              item.className = 'autocomplete-item-map-mobile';
              item.innerHTML = `
                <svg class="autocomplete-icon-map-mobile" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="autocomplete-text-map-mobile">${prediction.description}</span>
              `;

              item.addEventListener('click', function() {
                inputMobile.value = prediction.description;
                autocompleteContainerMobile.style.display = 'none';

                // Track the mobile search
                inputMobile.setAttribute('data-location-search-term-type', prediction.description);
                inputMobile.setAttribute('data-location-search-type', 'location search - body');
                inputMobile.setAttribute('data-location-search-method-type', 'user-entered');

                // Create new session token for next search
                sessionTokenMobile = new google.maps.places.AutocompleteSessionToken();
              });
              autocompleteContainerMobile.appendChild(item);
            });
          } else {
            autocompleteContainerMobile.style.display = 'none';
          }
        });
      }, debounceDelayMobile);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (e.target !== inputMobile && !autocompleteContainerMobile.contains(e.target)) {
        autocompleteContainerMobile.style.display = 'none';
      }
    });
  }

  // Add event listener for the "use-my-location" button
  const useMyLocationButton = document.querySelector('.use-my-location');
  if (useMyLocationButton) {
    useMyLocationButton.addEventListener('click', getCurrentLocation);
  }

  // Load initial location data
  // locationData = await fetchLocationData();
  // window.mapClusters = initMapWithStateClusters(window.map, window.locationDatas)
};

function getCurrentLocation() {
  const locationButton = document.querySelector('.use-my-location');
  if (!locationButton) {
    console.error('Location button not found');
    return;
  }

  locationButton.disabled = true;

  if (!navigator.geolocation) {
    locationButton.disabled = false;
    alert('Geolocation is not supported by your browser');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000 // 5 minutes
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        // Track the use of geolocation
        LocationTrackingUseLocationEvent(position);

        const address = await getAddressFromCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );

        // Fill the address in both desktop and mobile input fields
        const desktopInput = document.getElementById('pac-input');
        const mobileInput = document.getElementById('pac-input-mobile');

        if (desktopInput) desktopInput.value = address;
        if (mobileInput) mobileInput.value = address;

        // Track geolocation search
        const searchInput =
          document.getElementById('pac-input') || document.getElementById('pac-input-mobile');
        if (searchInput) {
          searchInput.setAttribute('data-location-search-term-type', address);
          searchInput.setAttribute('data-location-search-type', 'location search - body');
          searchInput.setAttribute('data-location-search-method-type', 'autofilled location');
        }

        // Update map and search with the address
        searchLocation(address);
      } catch (error) {
        console.error('Error:', error);
        alert('Unable to get your location. Please enter it manually.');
      } finally {
        locationButton.disabled = false;
      }
    },
    (error) => {
      console.error('Geolocation error:', error);
      locationButton.disabled = false;

      let errorMessage = 'Unable to get your location. Please enter it manually.';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission was denied. Please enter your location manually.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage =
            'Location information is unavailable. Please enter your location manually.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please enter your location manually.';
          break;
      }

      alert(errorMessage);
    },
    options
  );
}

function handleLocationError(browserHasGeolocation) {
  alert(
    browserHasGeolocation
      ? 'Error: The Geolocation service failed.'
      : "Error: Your browser doesn't support geolocation."
  );
}

function isValidUSZipcode(zipcode) {
  return /^\d{5}(-\d{4})?$/.test(zipcode);
}

function searchLocation(address, coordinates = null) {
  // window.mapClusters.cleanupClusters();
  const searchInput =
    document.getElementById('pac-input') || document.getElementById('pac-input-mobile');
  searchInput.setAttribute('data-search-term-type', address);
  
  if (coordinates) {
    // If coordinates are provided, use them directly
    updateMap(coordinates);
  } else {
    let geocodeRequest;

    if (isValidUSZipcode(address)) {
      geocodeRequest = {
        address: address,
        componentRestrictions: {
          country: 'US',
          postalCode: address
        }
      };
    } else {
      geocodeRequest = {
        address: address,
        componentRestrictions: {
          country: 'US'
        }
      };
    }

    window.geocoder.geocode(geocodeRequest, (results, status) => {
      if (status === 'OK' && results.length > 0) {
        const location = results[0].geometry.location;
        updateMap(location);
        searchInput.setAttribute('data-search-term-type', address);
      } else {
        console.error('Geocode was not successful for the following reason:', status);
        console.error('Input address:', address);
        console.error('Geocode request:', geocodeRequest);
        console.error(
          'Unable to find the location. Please try a different search term or check if the zip code is correct.'
        );
      }
    });
  }
}

function updateMap(location) {
  // Clear existing search markers
  window.markers.forEach((marker) => marker.setMap(null));
  window.markers = [];

  // Center the map on the searched location and zoom in
  window.map.setCenter(location);
  window.map.setZoom(11);
  // window.mapClusters.map.setZoom(11);

  // Display location markers within 50 miles of the search location
  displayLocationMarkers(location);
}
function getCountyFromAddress(address) {
  return new Promise((resolve, reject) => {
    window.geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK') {
        const addressComponents = results[0].address_components;
        let county = '';
        let stateCode = '';

        for (const component of addressComponents) {
          // Counties are typically marked with 'administrative_area_level_2'
          if (component.types.includes('administrative_area_level_2')) {
            county = component.long_name;
          }
          // State codes are marked with 'administrative_area_level_1'
          if (component.types.includes('administrative_area_level_1')) {
            stateCode = component.short_name;
          }
        }

        if (stateCode) {
          resolve({
            county: county || 'Unknown County',
            stateCode
          });
        } else {
          reject(new Error('State code not found in address components'));
        }
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

// Make functions available globally
window.searchLocation = searchLocation;
window.getCurrentLocation = getCurrentLocation;
window.calculateDistance = calculateDistance;
window.fetchLocationData = fetchLocationData;
window.getCountyFromAddress = getCountyFromAddress;
