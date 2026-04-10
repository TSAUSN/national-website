function LinkTrackingClickEvent(el, eventName, linkTextValue) {
  // Base link data (store only if attributes exist)

  let linkText = '';

  if (el.textContent !== '') {
    linkText = el.textContent.trim().replace(/\s+/g, ' ');
  } else if (el.textContent == '' && el.getAttribute('data-link-text')) {
    linkText = el.getAttribute('data-link-text').trim().replace(/\s+/g, ' ');
  } else {
    linkText = '';
  }

  const linkData = {
    event: eventName,
    link_function: el.getAttribute('data-function-type') || null,
    link_format: el.getAttribute('data-format-type') || null,
    link_text: linkTextValue ? linkTextValue : linkText,
    link_location: el.getAttribute('data-location-type') || null,
    link_url: el.getAttribute('href') || null,
    link_type: el.getAttribute('data-link-type') || null
  };

  // Filter out null or empty values
  const filteredLinkData = Object.fromEntries(
    Object.entries(linkData).filter(([_, value]) => value !== null && value !== '')
  );
  // Page-related attributes (only store attributes that exist)
  const pageData = [
    'data-page-componentHeading-type',
    'data-page-componentSubheading-type',
    'data-page-componentType-type',
    'data-page-componentIndex-type'
  ].reduce((acc, attr) => {
    const value = el.getAttribute(attr);
    if (value && value !== 'null') {
      // Check for both falsy values and the string "null"
      const key = attr.replace(/data-/, '').replace(/-type/g, '').replace(/-/g, '_');
      acc[key] = value;
    }
    return acc;
  }, {});

  const eventData = [
    'data-event-title-type',
    'data-event-id-type',
    'data-event-date-type',
    'data-event-time-type',
    'data-event-location-type'
  ].reduce((acc, attr) => {
    const value = el.getAttribute(attr);
    if (value && value !== 'null') {
      const key = attr.replace(/data-/, '').replace(/-type/g, '').replace(/-/g, '_');
      acc[key] = value;
    }
    return acc;
  }, {});

  // Merge and filter out any undefined values
  const trackingData = {
    ...filteredLinkData,
    ...pageData,
    ...eventData
  };
  // Send tracking data
  utag.link(trackingData);
}
