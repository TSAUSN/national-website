function LocationTrackingSearchEvent(el, eventName) {
  const locationSearchData = {
    event: eventName,
    location_search_term: el.getAttribute('data-search-term-type') || null,
    location_search_results: String(el.getAttribute('data-search-results-type')) || null,
    location_search_type: el.getAttribute('data-search-type-type') || null,
    location_search_method: el.getAttribute('data-search-method-type') || null,
    location_search_filter_type: el.getAttribute('data-search-filter-type') || null,
    location_search_filter_value: el.getAttribute('data-search-filter-value-type') || null
  };

  // Clean the locationSearchData object
  const cleanedLocationSearchData = cleanObject(locationSearchData);
  const locationResultData = [
    'data-result-index-type',
    'data-location-id-type',
    'data-location-name-type',
    'data-location-org-detail-type',
    'data-location-services-type'
  ].reduce((acc, attr) => {
    const value = el.getAttribute(attr);
    if (value) {
      const key = attr.replace(/data-/, '').replace(/-type/g, '').replace(/-/g, '_');
      acc[key] = value;
    }
    return acc;
  }, {});
  
  const linkData = [
    'data-link-function-type',
    'data-link-format-type',
    'data-link-text-type',
    'data-link-location-type',
    'data-link-url-type',
    'data-link-type-type'
  ].reduce((acc, attr) => {
    const value = el.getAttribute(attr);
    if (value) {
      const key = attr.replace(/data-/, '').replace(/-type/g, '').replace(/-/g, '_');
      acc[key] = value.trim().replace(/\s+/g, ' ');
    }
    return acc;
  }, {});

  const trackingData = {
    ...cleanedLocationSearchData,
    ...locationResultData,
    ...linkData
  };
  utag.link(trackingData);
}

function LocationTrackingUseLocationEvent(searchTerm) {
  // Strip PII by rounding coordinates to fewer decimal places
  // const lat = position?.coords?.latitude.toFixed(2) || '';
  // const lng = position?.coords?.longitude.toFixed(2) || '';
  // const searchTerm = lat && lng ? `${lat},${lng}` : '';

  utag.link({
    event: 'location_search_use_my_location',
    location_search_term: searchTerm
  });
}

function LocationTrackingResultsClickEvent(el, eventName) {
  const trackingData = {
    event: eventName || 'location_search_results_click',
    location_search_term: el.getAttribute('data-location-search-term') || null,
    location_search_results: String(el.getAttribute('data-location-search-results')) || null,
    location_search_type: el.getAttribute('data-location-search-type') || null,
    location_search_method: el.getAttribute('data-location-search-method') || null,
    location_search_result_index: String(el.getAttribute('data-location-search-result-index')) || null,
    location_id: el.getAttribute('data-location-id') || null,
    location_name: el.getAttribute('data-location-name') || null,
    location_org_detail: el.getAttribute('data-location-org-detail') || null,
    location_services: el.getAttribute('data-location-services') || null,
    location_search_filter_type: el.getAttribute('data-location-search-filter-type') || null,
    location_search_filter_value: el.getAttribute('data-location-search-filter-value') || null,
    link_function: el.getAttribute('data-link-function') || null,
    link_format: el.getAttribute('data-link-format') || null,
    link_text: el.textContent.trim().replace(/\s+/g, ' ') || null,
    link_location: el.getAttribute('data-link-location') || null,
    link_url: el.getAttribute('href') || null,
    link_type: el.getAttribute('data-link-type') || null
  };
  const cleanedTrackingData = cleanObject(trackingData);
  utag.link(cleanedTrackingData);
}

function LocationTrackingFilterEvent(
  searchTerm,
  resultsCount,
  searchType,
  searchMethod,
  filterType,
  filterValue
) {
  const linkData = {
    event: 'location_search_filter',
    location_search_term: searchTerm || '',
    location_search_results: resultsCount || '0',
    location_search_type: searchType || 'location search - body',
    location_search_method: searchMethod || 'autofilled filters',
    location_search_filter_type: filterType || '',
    location_search_filter_value: filterValue || ''
  }
  const cleanedTrackingData = cleanObject(linkData);
  utag.link(cleanedTrackingData);
}

function LocationTrackingMapClickEvent(markerData, searchInfo, eventName) {
  const mapClickEventData = {
    event: eventName || 'location_search_map_click',
    location_search_term: searchInfo.searchTerm || '',
    location_search_results: `${searchInfo.totalResults}` || '0',
    location_search_type: 'location search - body',
    location_search_method: searchInfo.searchMethod || 'user-entered',
    location_search_result_index: String(markerData.resultIndex) || '1',
    location_id: markerData.zuid || '',
    location_name: markerData.name || '',
    location_org_detail: markerData.organization_details || '',
    location_services: markerData.services || '',
    location_search_filter_type: searchInfo.filterType || '',
    location_search_filter_value: searchInfo.filterValue || ''
  }
  const cleanedMapClickEventData = cleanObject(mapClickEventData);
  utag.link(cleanedMapClickEventData);
}
// Function to clean object by removing null or empty values
function cleanObject(obj) {
  const cleanedObj = {};
  
  // Loop through all properties
  for (const key in obj) {
    // Only include properties that are not null, undefined, or empty strings
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '' && obj[key] !== 'null') {
      cleanedObj[key] = obj[key];
    }
  }
  
  return cleanedObj;
}