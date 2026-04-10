function servicesSearchEvent(el, eventName) {
	// Base search data
	const searchData = {
		event: eventName,
		services_search_term: el.getAttribute("data-search-term-type") || null,
	};

	// Conditionally include link-related data
	const linkData = [
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
		} else {
			acc[attr.replace(/data-/, "").replace(/-type/g, "").replace(/-/g, "_")] =
				"";
		}
		return acc;
	}, {});

	// Merge all data into one object
	const trackingData = {
		...searchData,
		...linkData,
	};

	// Send tracking data
	utag.link(trackingData);
}
