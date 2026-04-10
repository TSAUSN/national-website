function programsFilterEvent(el) {
	utag.link({
		event: "programs_filter",
		programs_filter_type: el.getAttribute("data-programs-filter-type") || null,
		programs_filter_value:
			el.getAttribute("data-programs-filter-value-type") || null,
	});
}
