function SiteSearchEvent(el, eventName) {
  // Base search data

  const searchData = {
    event: eventName,
    site_search_term: el.getAttribute('data-search-term-type') || el.textContent,
    site_search_type: el.getAttribute('data-search-type-type') || '',
    site_search_method: el.getAttribute('data-search-method') || '',
  };

  // Conditionally include search method and results
  const siteSearchResultData = [
    'data-search-method-type',
    'data-search-results-type',
    'data-result-index-type'
  ].reduce((acc, attr) => {
    const value = el.getAttribute(attr);
    if (value) {
      const key = attr.replace(/data-/, '').replace(/-type/g, '').replace(/-/g, '_');
      acc[key] = value;
    }
    return acc;
  }, {});

  // Conditionally include link-related data
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
      acc[key] = value.trim().replace(/\s+/g, " ");
    }
    return acc;
  }, {});

  // Merge all data into one object
  const trackingData = {
    ...searchData,
    ...siteSearchResultData,
    ...linkData
  };

  // Send tracking data
  utag.link(trackingData);
}

function searchResultClick(el) {
  // Base search data
  const searchData = {
    event: 'search_result_click',
    site_search_term: el.getAttribute('data-search-term-type') || el.textContent,
    site_search_type: el.getAttribute('data-search-type-type') || '',
    site_search_method: el.getAttribute('data-search-method-type') || '',
    site_search_results: el.getAttribute('data-search-results-type') || '',
    site_search_result_index: el.getAttribute('data-search-result-index-type') || null
  };

  // Conditionally include search method and results
  const siteSearchResultData = [
    'data-search-results-type',
    'data-result-index-type'
  ].reduce((acc, attr) => {
    const value = el.getAttribute(attr);
    if (value) {
      const key = attr.replace(/data-/, '').replace(/-type/g, '').replace(/-/g, '_');
      acc[key] = value;
    }
    return acc;
  }, {});

  // Conditionally include link-related data
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
      const key = attr.replace(/data-/, '').replace(/-type/, '').replace(/-/g, '_');
      acc[key] = value;
    }
    return acc;
  }, {});

  // Merge all data into one object
  const trackingData = {
    ...searchData,
    ...siteSearchResultData,
    ...linkData
  };

  // Send tracking data
  utag.link(trackingData);
}
