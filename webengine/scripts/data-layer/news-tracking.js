function newsFilterEvent(el) {
  // Base video data
  const newsData = {
    event: 'news_search_filter',
    news_search_term: el.getAttribute('data-search-term'),
    news_search_filter_type: el.getAttribute('data-search-filter-type'),
    news_search_filter_value: el.getAttribute('data-search-filter-value')
  };
  utag.link(newsData);
}
function newsSearchViewMoreEvent(el) {
  let linkText = '';

  if (el.textContent !== '') {
    linkText = el.textContent.trim().replace(/\s+/g, ' ');
  } else if (el.textContent == '' && el.getAttribute('data-link-text')) {
    linkText = el.getAttribute('data-link-text').trim().replace(/\s+/g, ' ');
  } else {
    linkText = '';
  }
  const newsData = {
    event: 'news_search_view_more',
    news_search_term: el.getAttribute('data-news-search-term') || null,
    news_search_filter_type: el.getAttribute('data-news-search-filter-type') || null,
    news_search_filter_value: el.getAttribute('data-news-search-filter-value') || null,
    link_function: el.getAttribute('data-news-link-function') || null,
    link_format: el.getAttribute('data-news-link-format') || null,
    link_text: linkText,
    link_location: el.getAttribute('data-news-link-location') || null,
    link_url: el.getAttribute('data-news-link-url') || null,
    link_type: el.getAttribute('data-news-link-type') || null
  };
  // Filter out null or empty values
  const filteredNewsData = Object.fromEntries(
    Object.entries(newsData).filter(([_, value]) => value !== null && value !== '')
  );
  utag.link(filteredNewsData);
}
function newsSearchEvent(el) {
  const newsData = {
    event: 'news_search',
    news_search_term: el.getAttribute('data-news-search-term') || null,
    news_search_filter_type: el.getAttribute('data-news-search-filter-type') || null,
    news_search_filter_value: el.getAttribute('data-news-search-filter-value') || null
  };
  const filteredNewsData = Object.fromEntries(
    Object.entries(newsData).filter(([_, value]) => value !== null && value !== '')
  );
  utag.link(filteredNewsData);
}

function newsSearchResultClickEvent(el) {
  const newsData = {
    event: 'news_search_result_click',
    link_format: el.getAttribute('data-link-format') || null,
    link_function: el.getAttribute('data-function-type') || null,
    link_url: el.getAttribute('data-link-url') || null,
    link_text: el.getAttribute('data-link-text') || null,
    link_location: el.getAttribute('data-link-location') || null,
    link_type: el.getAttribute('data-link-type') || null,
    news_search_term: el.getAttribute('data-search-term') || null,
    news_search_filter_type: el.getAttribute('data-news-search-filter-type') || null,
    news_search_filter_value: el.getAttribute('data-news-search-filter-value') || null
  };
  const filteredNewsData = Object.fromEntries(
    Object.entries(newsData).filter(([_, value]) => value !== null && value !== '')
  );
  utag.link(filteredNewsData);
}
