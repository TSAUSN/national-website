function volunteerSearchEvent(el, eventName) {
	// Base search data
	const searchData = {
		event: eventName,
		volunteer_search_term:
			el.getAttribute("data-volunteer-search-term-type") || null,
		volunteer_search_type:
			el.getAttribute("data-volunteer-search-type-type") || null,
		volunteer_search_method:
			el.getAttribute("data-volunteer-search-method-type") || null,
		volunteer_location_search_term:
			el.getAttribute("data-location-search-term-type") || null,
		volunteer_location_search_results:
			el.getAttribute("data-location-search-results-type") || null,
		volunteer_location_search_type:
			el.getAttribute("data-location-search-type-type") || null,
		volunteer_location_search_method:
			el.getAttribute("data-location-search-method-type") || null,
	};

	// Conditionally include location-related data
	const locationData = [
		"data-location-result-index-type",
		"data-location-id-type",
		"data-location-name-type",
		"data-location-org-detail-type",
		"data-location-services-type",
		"data-link-function-type",
		"data-link-format-type",
		"data-link-text-type",
		"data-link-location-type",
		"data-link-url-type",
		"data-link-type-type",
	].reduce((acc, attr) => {
		const value = el.getAttribute(attr);
		if (value) {
			const key = attr
				.replace(/data-/, "")
				.replace(/-type/g, "")
				.replace(/-/g, "_");
			acc[key] = value.trim().replace(/\s+/g, " ");
		}
		return acc;
	}, {});

	// Merge all data into one object
	const trackingData = {
		...searchData,
		...locationData,
	};

	// Send tracking data
	utag.link(trackingData);
}
