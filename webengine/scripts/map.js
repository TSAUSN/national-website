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

  let warned = false;
  const tryLoad = (attempt = 0) => {
    if (window.__mapsRequested) return;
    if (typeof loadGoogleMapsAPI === 'function') {
      window.__mapsRequested = true;
      loadGoogleMapsAPI();
      return;
    }
    // main.js (which defines loadGoogleMapsAPI) hasn't finished loading yet.
    // Keep retrying instead of silently giving up - fast for the first 3s,
    // then back off so we don't spam timers if the page/tab is throttled
    // (e.g. a backgrounded Edge tab), but never abandon the load entirely.
    if (attempt >= 30 && !warned) {
      warned = true;
      console.warn(
        'Google Maps: loadGoogleMapsAPI (main.js) is not available yet after 3s. Still retrying...'
      );
    }
    const delay = attempt < 30 ? 100 : 1000;
    setTimeout(() => tryLoad(attempt + 1), delay);
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
  // Remove existing location info and inject HTML into DOM first
  let locationInfo = contentWrapper.querySelector('.location-info');
  if (locationInfo) {
    locationInfo.remove();
  }
  const initialContent = document.querySelector('.map-init-content');
  if (initialContent) {
    initialContent.classList.add('d-none');
  }
  contentWrapper.insertAdjacentHTML('afterbegin', html);

  // Load services after HTML is in the DOM so getElementById finds the container
  (async function () {
    const servicesContainer = document.getElementById('services-container');
    if (!servicesContainer) return;

    const serviceTypeZuids = (markerData.services_offered || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (serviceTypeZuids.length === 0) {
      servicesContainer.innerHTML = '<div class="col">No services available</div>';
      return;
    }

    const fetchServicesForLocation = async function (zuidArg) {
      try {
        const response = await fetch(`${window.location.origin}/services.json?location=${zuidArg}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching services:', error);
        return [];
      }
    };

    const fetchServiceType = async function (serviceTypeZuid) {
      try {
        const response = await fetch(`${window.location.origin}/service-types.json?zuid=${serviceTypeZuid}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
      } catch (error) {
        console.error('Error fetching service type:', error);
        return false;
      }
    };

    try {
      const services = await fetchServicesForLocation(markerData.zuid);
      const servicesInnerHTML = [];

      for (const serviceTypeZuid of serviceTypeZuids) {
        const serviceTypeData = await fetchServiceType(serviceTypeZuid);
        if (!serviceTypeData || !serviceTypeData[0]) continue;

        const rawIconName = serviceTypeData[0]?.icon_name;
        const iconName = (rawIconName && rawIconName !== 'NULL') ? rawIconName : '';

        const matchingService = Array.isArray(services)
          ? services.find((s) => s.service_type?.data?.[0]?.meta?.zuid === serviceTypeZuid)
          : null;

        if (matchingService) {
          const title = matchingService.title || '';
          if (!title) continue;
          servicesInnerHTML.push(`
            <div class="col">
              <div class="d-flex align-items-start">
                <span class="material-symbols-outlined text-primary-200 display-6">${iconName}</span>
                <a href="${matchingService.meta?.web?.url || '#'}" class="display-5 text-dark-100 display-md-1 ms-2">${title}</a>
              </div>
            </div>
          `);
        } else {
          const label = serviceTypeData[0]?.meta?.web_title || serviceTypeData[0]?.title || '';
          if (!label) continue;
          servicesInnerHTML.push(`
            <div class="col">
              <div class="d-flex align-items-start">
                <span class="material-symbols-outlined text-primary-200 display-6">${iconName}</span>
                <span class="display-5 text-dark-100 display-md-1 ms-2">${label}</span>
              </div>
            </div>
          `);
        }
      }

      servicesContainer.innerHTML = servicesInnerHTML.length > 0
        ? servicesInnerHTML.join('')
        : '<div class="col">No services available</div>';
    } catch (error) {
      console.error('Error loading services:', error);
      const sc = document.getElementById('services-container');
      if (sc) sc.innerHTML = '<div class="col">Error loading services</div>';
    }
  })();
}

// Add event listener for marker clicks
document.addEventListener('markerClicked', (event) => {
  handleMarkerContent(event.detail);
});

async function fetchAllLocations(retriesLeft = 2) {
  const locationsPath =
    window.instanceEnv === 'dev' ? '/locations-dev.json' : '/locations.json';
  const response = await fetch(`${locationsPath}?_bypassError=true`);

  if (!response.ok) {
    if (retriesLeft > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fetchAllLocations(retriesLeft - 1);
    }
    throw new Error(`Failed to fetch locations (status=${response.status})`);
  }

  const rawData = await response.text();
  const data = JSON.parse(rawData);

  if (!Array.isArray(data)) {
    throw new Error('Location data is not in the expected format');
  }

  return data;
}

// Multiple call sites (initAutocomplete, initLocationFinder, displayLocationMarkers)
// all want the same location data - without this guard each one triggers its own
// full paginated fetch of the entire dataset, multiplying load on /locations.json.
window.__locationDataPromise = null;

async function fetchLocationData() {
  if (window.locationDatas && window.locationDatas.length > 0) {
    return window.locationDatas;
  }

  if (window.__locationDataPromise) {
    return window.__locationDataPromise;
  }

  window.__locationDataPromise = (async () => {
    const loader = document.querySelector('.map-loader');
    if (loader) {
      loader.classList.remove('d-none');
    }

    try {
      const allLocations = await fetchAllLocations();
      window.locationDatas = allLocations;
      return allLocations;
    } catch (error) {
      console.error('Error fetching location data:', error);
      window.locationDatas = [];
      return [];
    } finally {
      if (loader) {
        loader.classList.add('d-none');
      }
      window.__locationDataPromise = null;
    }
  })();

  return window.__locationDataPromise;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const p1 = new google.maps.LatLng(lat1, lon1);
  const p2 = new google.maps.LatLng(lat2, lon2);
  // Returns distance in meters, convert to miles
  return google.maps.geometry.spherical.computeDistanceBetween(p1, p2) * 0.000621371;
}

// Helper function to geocode an address. Retries with backoff when Google
// throttles us (OVER_QUERY_LIMIT), which becomes more likely the more
// addresses we geocode concurrently (see GEOCODE_BATCH_SIZE below).
function geocodeAddress(address, retriesLeft = 3, retryDelay = 500) {
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
        } else if (status === 'OVER_QUERY_LIMIT' && retriesLeft > 0) {
          setTimeout(() => {
            geocodeAddress(address, retriesLeft - 1, retryDelay * 2)
              .then(resolve)
              .catch(reject);
          }, retryDelay + Math.random() * retryDelay);
        } else {
          reject(new Error(`Geocoding failed for address: ${address} (status: ${status})`));
        }
      }
    );
  });
}

// --- Autocomplete place selection helpers -----------------------------------
// The Geocoder can resolve a free-text prediction description such as
// "Jackson, GA, USA" to the county instead of the city. When the user picks a
// suggestion we keep its place_id and geocode by placeId instead, which always
// resolves to the exact place the user picked.
const latestPlacePredictions = new WeakMap();

function rememberPlaceSelection(inputEl, prediction) {
  if (!inputEl || !prediction) return;
  if (prediction.place_id) {
    inputEl.dataset.placeId = prediction.place_id;
    inputEl.dataset.placeDescription = prediction.description;
    delete inputEl.dataset.pickedText;
  } else {
    clearPlaceSelection(inputEl);
  }
}

function clearPlaceSelection(inputEl) {
  if (!inputEl) return;
  delete inputEl.dataset.placeId;
  delete inputEl.dataset.placeDescription;
  delete inputEl.dataset.autofilledText;
  delete inputEl.dataset.pickedText;
}

function cachePredictions(inputEl, predictions) {
  if (!inputEl) return;
  latestPlacePredictions.set(inputEl, Array.isArray(predictions) ? predictions : []);
}

function getSearchGeocoder() {
  return window.geocoder || new google.maps.Geocoder();
}

function geocodeByPlaceId(placeId) {
  return new Promise((resolve, reject) => {
    // placeId must be the only lookup parameter (no address/componentRestrictions)
    getSearchGeocoder().geocode({ placeId: placeId }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        resolve(results[0].geometry.location);
      } else {
        reject(new Error(`Geocoding failed for placeId: ${placeId} (status: ${status})`));
      }
    });
  });
}

function geocodeSearchText(text) {
  const geocodeRequest = {
    address: text,
    componentRestrictions: { country: 'US' }
  };
  if (isValidUSZipcode(text)) {
    geocodeRequest.componentRestrictions.postalCode = text;
  }

  return new Promise((resolve, reject) => {
    getSearchGeocoder().geocode(geocodeRequest, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        resolve(results);
      } else {
        const error = new Error(`Geocoding failed for address: ${text} (status: ${status})`);
        error.status = status;
        error.geocodeRequest = geocodeRequest;
        reject(error);
      }
    });
  });
}

function findCityPrediction(text) {
  return new Promise((resolve) => {
    if (!google.maps.places || !google.maps.places.AutocompleteService) {
      resolve(null);
      return;
    }
    new google.maps.places.AutocompleteService().getPlacePredictions(
      {
        input: text,
        types: ['(cities)'],
        componentRestrictions: { country: 'US' }
      },
      (predictions, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          predictions &&
          predictions.length > 0
        ) {
          resolve(predictions[0]);
        } else {
          resolve(null);
        }
      }
    );
  });
}

// Resolves the search text to a google.maps.LatLng, preferring the place_id of
// the autocomplete suggestion the user picked (or one whose description
// matches the typed text) over a free-text geocode.
async function resolveSearchLatLng(inputEl, text) {
  const searchText = String(text || '').trim();

  const dataset = inputEl && inputEl.dataset;
  const pickedSuggestion =
    !!dataset && !!dataset.placeId && searchText === dataset.placeDescription;
  const isAutofilledText =
    !!dataset &&
    dataset.autofilledText !== undefined &&
    searchText === String(dataset.autofilledText).trim();
  // A picked suggestion whose place_id failed: still the user's pick, not typed text
  const isPickedText =
    !!dataset && dataset.pickedText !== undefined && searchText === dataset.pickedText;

  // 1b. Typed "Place, ST" (with a comma) means the same-name county; "Place ST"
  //     (no comma) falls through to the city. Skipped for a picked suggestion
  //     and for text filled by "use my location".
  if (!pickedSuggestion && !isAutofilledText && !isPickedText) {
    const commaPlace = parseCommaPlaceName(searchText);
    if (
      commaPlace &&
      window.google &&
      google.maps.places &&
      google.maps.places.AutocompleteService
    ) {
      let county = null;
      try {
        county = await findSameNameCounty(
          new google.maps.places.AutocompleteService(),
          { types: ['(regions)'], componentRestrictions: { country: 'US' } },
          commaPlace.name,
          commaPlace.stateCode
        );
      } catch (error) {
        console.warn('County lookup failed, falling back to text search:', error);
      }
      if (county && county.place_id) {
        try {
          return await geocodeByPlaceId(county.place_id);
        } catch (error) {
          console.warn('County place ID lookup failed, falling back to text search:', error);
          forgetFailedCounty(county.place_id, commaPlace.name, commaPlace.stateCode, inputEl);
        }
      }
    }
  }

  if (dataset) {
    // 1. Suggestion picked and text not edited since
    //    (on failure, e.g. a stale/invalid place_id, fall through to the text geocode)
    let placeId = null;
    let fromStoredSelection = false;
    let cachedMatch = null;
    if (pickedSuggestion) {
      placeId = inputEl.dataset.placeId;
      fromStoredSelection = true;
    } else {
      // 2. Typed text exactly matches one of the latest suggestions
      const cached = latestPlacePredictions.get(inputEl) || [];
      const lowerText = searchText.toLowerCase();
      const match = cached.find(
        (prediction) =>
          prediction &&
          prediction.place_id &&
          String(prediction.description || '').trim().toLowerCase() === lowerText
      );
      if (match) {
        placeId = match.place_id;
        cachedMatch = match;
      }
    }

    if (placeId) {
      try {
        return await geocodeByPlaceId(placeId);
      } catch (error) {
        console.warn('Place ID lookup failed, falling back to text search:', error);
        // Forget the failed place_id so later searches don't retry it
        if (fromStoredSelection) {
          // Keep a "picked" marker so the same text still skips the comma rule
          // until the user edits the input (clearPlaceSelection removes it)
          const pickedText = inputEl.dataset.placeDescription;
          delete inputEl.dataset.placeId;
          delete inputEl.dataset.placeDescription;
          inputEl.dataset.pickedText = pickedText;
          // The cached suggestion with the same place_id must not retry it either
          const remaining = (latestPlacePredictions.get(inputEl) || []).filter(
            (prediction) => prediction && prediction.place_id !== placeId
          );
          latestPlacePredictions.set(inputEl, remaining);
        } else if (cachedMatch) {
          const remaining = (latestPlacePredictions.get(inputEl) || []).filter(
            (prediction) => prediction !== cachedMatch
          );
          latestPlacePredictions.set(inputEl, remaining);
        }
      }
    }
  }

  // 3. Free-text geocode
  const results = await geocodeSearchText(searchText);
  const first = results[0];
  const firstTypes = first.types || [];

  // County guard: "Jackson, GA" can geocode to Jackson County. Unless the user
  // asked for a county/parish/borough, prefer a city/ZIP result.
  if (
    firstTypes.includes('administrative_area_level_2') &&
    !/\b(county|parish|borough)\b/i.test(searchText)
  ) {
    const cityResult = results.find((result) => {
      const types = result.types || [];
      return (
        types.includes('locality') ||
        types.includes('postal_code') ||
        types.includes('sublocality')
      );
    });
    if (cityResult) {
      return cityResult.geometry.location;
    }

    try {
      const cityPrediction = await findCityPrediction(searchText);
      if (cityPrediction && cityPrediction.place_id) {
        return await geocodeByPlaceId(cityPrediction.place_id);
      }
    } catch (error) {
      console.warn('City fallback lookup failed, using first geocode result:', error);
    }
  }

  return first.geometry.location;
}

// --- City + county autocomplete suggestions ---------------------------------
// For "Jackson GA" the (regions) predictions only return the city. When the
// text names a city and a state, also suggest that state's same-name county
// (parish in LA, borough in AK) right after the city.
const US_STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};
const US_STATE_CODES_BY_NAME = Object.keys(US_STATE_NAMES).reduce((codes, code) => {
  codes[US_STATE_NAMES[code].toLowerCase()] = code;
  return codes;
}, {});
const STATE_HINT_PATTERN = new RegExp(
  '^(.+?)[,\\s]+(' +
    Object.keys(US_STATE_NAMES)
      .concat(Object.values(US_STATE_NAMES))
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')(?:[,\\s]+(usa|us|united states))?$',
  'i'
);
const COUNTY_LIKE_PATTERN = /\b(county|parish|borough|census area)\b/i;
const countySuggestionCache = new Map();
const predictionRequestCounters = new WeakMap();

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toStateCode(value) {
  const text = String(value || '').trim();
  if (US_STATE_NAMES[text.toUpperCase()]) return text.toUpperCase();
  return US_STATE_CODES_BY_NAME[text.toLowerCase()] || null;
}

function parseCityStateHint(text) {
  const match = String(text || '').trim().match(STATE_HINT_PATTERN);
  if (!match) return null;
  const name = match[1].replace(/[,\s]+$/, '').trim();
  const stateCode = toStateCode(match[2]);
  if (!name || !stateCode) return null;
  return { name, stateCode };
}

// "Place, ST" typed with a comma (e.g. "Jackson, GA", "Jackson, Georgia, USA").
// Unlike STATE_HINT_PATTERN, the name may not contain commas or start with a
// digit, so street addresses and "City ST" (no comma) don't match.
const COMMA_PLACE_PATTERN = new RegExp(
  '^([^,\\d][^,]*?)\\s*,\\s*(' +
    Object.keys(US_STATE_NAMES)
      .concat(Object.values(US_STATE_NAMES))
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')(?:[,\\s]+(?:usa|us|united states))?\\s*,?$',
  'i'
);

function parseCommaPlaceName(text) {
  const normalized = String(text || '')
    .trim()
    .replace(/\s+/g, ' ');
  const match = normalized.match(COMMA_PLACE_PATTERN);
  if (!match) return null;
  const name = match[1].trim();
  const stateCode = toStateCode(match[2]);
  if (!name || !stateCode || COUNTY_LIKE_PATTERN.test(name)) return null;
  return { name, stateCode };
}

function getPredictionStateCode(prediction) {
  const terms = (prediction && prediction.terms) || [];
  if (terms.length < 2) return null;
  return toStateCode(terms[terms.length - 2].value);
}

function getPredictionMainText(prediction) {
  return String(
    (prediction && prediction.structured_formatting && prediction.structured_formatting.main_text) ||
      ''
  ).trim();
}

function hasPredictionType(prediction, types) {
  const predictionTypes = (prediction && prediction.types) || [];
  return types.some((type) => predictionTypes.includes(type));
}

function isSameNameCounty(prediction, name, stateCode) {
  const countyPattern = new RegExp(
    '^' +
      escapeRegExp(name) +
      ' (County|Parish|Borough|Census Area|Municipality|City and Borough)$',
    'i'
  );
  return (
    hasPredictionType(prediction, ['administrative_area_level_2']) &&
    countyPattern.test(getPredictionMainText(prediction)) &&
    getPredictionStateCode(prediction) === stateCode
  );
}

function getPlacePredictionsAsync(service, request) {
  return new Promise((resolve) => {
    try {
      service.getPlacePredictions(request, (predictions, status) => {
        resolve({ predictions: predictions || null, status });
      });
    } catch (error) {
      resolve({ predictions: null, status: 'ERROR', error });
    }
  });
}

function countyCacheKey(name, stateCode) {
  return `${String(name).toLowerCase()}|${stateCode}`;
}

// A county place_id that failed to geocode is never retried: cache "no county"
// for that city/state (so the dropdown stops showing the row) and drop it from
// the input's cached suggestions (so the cached-match step can't retry it).
function forgetFailedCounty(placeId, name, stateCode, inputEl) {
  countySuggestionCache.set(countyCacheKey(name, stateCode), null);
  countySuggestionCache.forEach((cachedCounty, key) => {
    if (cachedCounty && cachedCounty.place_id === placeId) {
      countySuggestionCache.set(key, null);
    }
  });
  if (inputEl) {
    const remaining = (latestPlacePredictions.get(inputEl) || []).filter(
      (prediction) => prediction && prediction.place_id !== placeId
    );
    latestPlacePredictions.set(inputEl, remaining);
  }
}

// Looks up (and caches) the same-name county for a city. Never rejects.
async function findSameNameCounty(service, request, name, stateCode) {
  const cacheKey = countyCacheKey(name, stateCode);
  if (countySuggestionCache.has(cacheKey)) {
    return countySuggestionCache.get(cacheKey);
  }

  const suffix = stateCode === 'LA' ? 'Parish' : stateCode === 'AK' ? 'Borough' : 'County';
  const { predictions, status } = await getPlacePredictionsAsync(service, {
    ...request,
    input: `${name} ${suffix}, ${stateCode}`
  });

  if (status !== google.maps.places.PlacesServiceStatus.OK && status !== 'ZERO_RESULTS') {
    // Transient failure: don't cache, just skip the county row this time
    return null;
  }

  const county =
    (predictions || []).find((prediction) => isSameNameCounty(prediction, name, stateCode)) ||
    null;
  countySuggestionCache.set(cacheKey, county);
  return county;
}

// Wraps AutocompleteService.getPlacePredictions and, for "City ST" input, adds
// the same-name county right after the city. Resolves { predictions, status,
// stale }; callers should skip rendering when stale is true.
async function fetchPlacePredictions(service, request, inputEl) {
  const requestId = inputEl ? (predictionRequestCounters.get(inputEl) || 0) + 1 : 0;
  if (inputEl) predictionRequestCounters.set(inputEl, requestId);

  const isStale = () =>
    !!inputEl &&
    (predictionRequestCounters.get(inputEl) !== requestId || inputEl.value !== request.input);

  const primary = await getPlacePredictionsAsync(service, request);
  if (isStale()) return { ...primary, stale: true };
  if (primary.status !== google.maps.places.PlacesServiceStatus.OK || !primary.predictions) {
    return primary;
  }

  const predictions = primary.predictions;
  const inputText = String(request.input || '').trim();

  try {
    if (/^\d/.test(inputText) || COUNTY_LIKE_PATTERN.test(inputText)) return primary;

    const hint = parseCityStateHint(inputText);
    if (!hint) return primary;

    const cityIndex = predictions.findIndex(
      (prediction) =>
        hasPredictionType(prediction, ['locality', 'administrative_area_level_3']) &&
        getPredictionMainText(prediction).toLowerCase() === hint.name.toLowerCase() &&
        getPredictionStateCode(prediction) === hint.stateCode
    );
    if (cityIndex === -1) return primary;
    if (predictions.some((prediction) => isSameNameCounty(prediction, hint.name, hint.stateCode))) {
      return primary;
    }

    const cityName = getPredictionMainText(predictions[cityIndex]);
    const county = await findSameNameCounty(service, request, cityName, hint.stateCode);
    if (isStale()) return { ...primary, stale: true };
    if (!county || predictions.some((prediction) => prediction.place_id === county.place_id)) {
      return primary;
    }

    const merged = predictions.slice();
    merged.splice(cityIndex + 1, 0, county);
    return { predictions: merged, status: primary.status };
  } catch (error) {
    // The county lookup must never block the primary suggestions
    console.warn('County suggestion lookup failed:', error);
    return isStale() ? { ...primary, stale: true } : primary;
  }
}

// Short label for a suggestion's place type ('' when there is nothing useful)
function getPredictionTypeLabel(prediction) {
  const types = (prediction && prediction.types) || [];
  if (types.includes('postal_code')) return 'ZIP';
  if (types.includes('locality') || types.includes('administrative_area_level_3')) return 'City';
  if (types.includes('administrative_area_level_2')) {
    const mainText = getPredictionMainText(prediction);
    if (/\bParish$/i.test(mainText)) return 'Parish';
    if (/\bBorough$/i.test(mainText)) return 'Borough';
    return 'County';
  }
  if (types.includes('administrative_area_level_1')) return 'State';
  if (types.some((type) => type.indexOf('sublocality') === 0) || types.includes('neighborhood')) {
    return 'Neighborhood';
  }
  return '';
}

// Used by the map.js widgets: fetch (with county rows) and skip stale responses
function requestWidgetPredictions(service, request, inputEl, callback) {
  fetchPlacePredictions(service, request, inputEl)
    .then((result) => {
      if (!result.stale) callback(result.predictions, result.status);
    })
    .catch((error) => console.warn('Autocomplete predictions failed:', error));
}

// Appends the place-type badge ("City", "County", "ZIP", ...) to a suggestion row
function appendPredictionTypeBadge(item, prediction) {
  const typeLabel = getPredictionTypeLabel(prediction);
  if (!typeLabel) return;
  const badge = document.createElement('span');
  badge.className = 'badge rounded-pill text-bg-light ms-auto';
  badge.textContent = typeLabel;
  item.appendChild(badge);
}

window.rememberPlaceSelection = rememberPlaceSelection;
window.clearPlaceSelection = clearPlaceSelection;
window.cachePredictions = cachePredictions;
window.resolveSearchLatLng = resolveSearchLatLng;
window.fetchPlacePredictions = fetchPlacePredictions;
window.getPredictionTypeLabel = getPredictionTypeLabel;

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

    // Process locations needing geocoding in parallel batches instead of one at a
    // time, since sequential awaits here could add up to a long delay when many
    // locations are missing coordinates.
    const GEOCODE_BATCH_SIZE = 100;
    for (let i = 0; i < locationsNeedingGeocoding.length; i += GEOCODE_BATCH_SIZE) {
      const batch = locationsNeedingGeocoding.slice(i, i + GEOCODE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((location) => geocodeAddress(location.address))
      );

      results.forEach((result, index) => {
        const location = batch[index];
        if (result.status !== 'fulfilled') {
          console.warn(`Failed to geocode address for location: ${location.name}`, result.reason);
          return;
        }

        const coords = result.value;
        const distance = calculateDistance(searchLat, searchLng, coords.lat, coords.lng);

        if (distance <= 50) {
          // Add geocoded coordinates to the location object
          location.latitude = coords.lat;
          location.longitude = coords.lng;
          filteredLocations.push(location);
        }
      });
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
        defaultIcon: customIcon // Store default icon
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
      if (stripos('Contact Store for hours', location.hours_of_operation)) {
        generalHours = 'Contact location for hours';
      } else if (stripos('Contact for hours', location.hours_of_operation)) {
        generalHours = 'Contact location for hours';
      } else {
        generalHours = location.hours_of_operation;
      }
      console.log('Locations Marker Data:', location);
      marker.locationData = {
        resultIndex: (index + 1).toString(),
        zuid: location.zuid || '',
        name: convertHtmlEntities(location.name) || '',
        organization_details: `SAL^${location.territory || ''}^${location.division || ''}^${
          location.corps || ''
        }`,
        services: location.services ? location.services.map((s) => s.title).join(',') : '',
        services_offered: location.service_types || '',
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
    if (searchTerm) {
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
  const hasAnyMapClass = mapClass.some((className) =>
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
            icon: customIcon
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
      if (typeof window.getLocationAddress === 'function') {
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
      top: 100%;
      left: 0;
      right: 0;
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

    input.addEventListener('input', function () {
      const value = this.value;
      clearPlaceSelection(this);

      clearTimeout(debounceTimer);

      if (value.length < 3) {
        autocompleteContainer.style.display = 'none';
        return;
      }

      // Debounce API call - only fire after user stops typing
      debounceTimer = setTimeout(() => {
        requestWidgetPredictions(
          autocompleteService,
          {
            input: value,
            types: ['(regions)'], // Regions type for city/ZIP searches (cheaper than geocode)
            componentRestrictions: { country: 'US' },
            sessionToken: sessionToken
          },
          input,
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              cachePredictions(input, predictions);
              autocompleteContainer.innerHTML = '';
              autocompleteContainer.style.display = 'block';

              predictions.forEach((prediction) => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item-map';
                item.innerHTML = `
                <svg class="autocomplete-icon-map" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="autocomplete-text-map">${prediction.description}</span>
              `;
                appendPredictionTypeBadge(item, prediction);

                item.addEventListener('click', function () {
                  input.value = prediction.description;
                  autocompleteContainer.style.display = 'none';

                  // Track the search before performing it
                  input.setAttribute('data-location-search-term-type', prediction.description);
                  input.setAttribute('data-location-search-type', 'location search - body');
                  input.setAttribute('data-location-search-method-type', 'user-entered');

                  // Keep the picked place_id so the search resolves to this exact place
                  rememberPlaceSelection(input, prediction);

                  // Create new session token for next search
                  sessionToken = new google.maps.places.AutocompleteSessionToken();
                });
                autocompleteContainer.appendChild(item);
              });
            } else {
              autocompleteContainer.style.display = 'none';
            }
          }
        );
      }, debounceDelay);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (e.target !== input && !autocompleteContainer.contains(e.target)) {
        autocompleteContainer.style.display = 'none';
      }
    });
  } else {
    console.warn('pac-input element not found');
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
      top: 100%;
      left: 0;
      right: 0;
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

    inputMobile.addEventListener('input', function () {
      const value = this.value;
      clearPlaceSelection(this);

      clearTimeout(debounceTimerMobile);

      if (value.length < 3) {
        autocompleteContainerMobile.style.display = 'none';
        return;
      }

      // Debounce API call - only fire after user stops typing
      debounceTimerMobile = setTimeout(() => {
        requestWidgetPredictions(
          autocompleteServiceMobile,
          {
            input: value,
            types: ['(regions)'], // Regions type for city/ZIP searches (cheaper than geocode)
            componentRestrictions: { country: 'US' },
            sessionToken: sessionTokenMobile
          },
          inputMobile,
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              cachePredictions(inputMobile, predictions);
              autocompleteContainerMobile.innerHTML = '';
              autocompleteContainerMobile.style.display = 'block';

              predictions.forEach((prediction) => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item-map-mobile';
                item.innerHTML = `
                <svg class="autocomplete-icon-map-mobile" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="autocomplete-text-map-mobile">${prediction.description}</span>
              `;
                appendPredictionTypeBadge(item, prediction);

                item.addEventListener('click', function () {
                  inputMobile.value = prediction.description;
                  autocompleteContainerMobile.style.display = 'none';

                  // Track the mobile search
                  inputMobile.setAttribute(
                    'data-location-search-term-type',
                    prediction.description
                  );
                  inputMobile.setAttribute('data-location-search-type', 'location search - body');
                  inputMobile.setAttribute('data-location-search-method-type', 'user-entered');

                  // Keep the picked place_id so the search resolves to this exact place
                  rememberPlaceSelection(inputMobile, prediction);

                  // Create new session token for next search
                  sessionTokenMobile = new google.maps.places.AutocompleteSessionToken();
                });
                autocompleteContainerMobile.appendChild(item);
              });
            } else {
              autocompleteContainerMobile.style.display = 'none';
            }
          }
        );
      }, debounceDelayMobile);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function (e) {
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
        // Mark as autofilled so a "City, State" result isn't read as a typed county search
        if (desktopInput) desktopInput.dataset.autofilledText = address;
        if (mobileInput) mobileInput.dataset.autofilledText = address;

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
    // Use whichever form input the search came from, so its picked place_id is used
    const trimmedAddress = String(address || '').trim();
    const desktopInput = document.getElementById('pac-input');
    const mobileInput = document.getElementById('pac-input-mobile');
    let sourceInput = searchInput;
    if (desktopInput && desktopInput.value.trim() === trimmedAddress) {
      sourceInput = desktopInput;
    } else if (mobileInput && mobileInput.value.trim() === trimmedAddress) {
      sourceInput = mobileInput;
    }

    resolveSearchLatLng(sourceInput, address)
      .then((location) => {
        updateMap(location);
        searchInput.setAttribute('data-search-term-type', address);
      })
      .catch((error) => {
        console.error(
          'Geocode was not successful for the following reason:',
          (error && error.status) || error
        );
        console.error('Input address:', address);
        if (error && error.geocodeRequest) {
          console.error('Geocode request:', error.geocodeRequest);
        }
        console.error(
          'Unable to find the location. Please try a different search term or check if the zip code is correct.'
        );
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
