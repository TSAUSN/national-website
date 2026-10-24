// Pages that render each module, and how to recognise it. Each module is tested on
// one page: `selector` must match on that page, `marker` must appear in its inline
// scripts (script-only modules). `visible: false` only checks the element is in the
// DOM. Modules not listed are unused, empty, or have no public page.
module.exports = [
  {
    path: '/stories/',
    modules: [
      { module: 'all-stories-archive', selector: '.news-archive-search #newsSearchForm' }
    ]
  },
  {
    path: '/walmart-angel-tree/',
    modules: [
      { module: 'angel-tree-wy', selector: '.angel-tree-wy-container:has(~ #ATonline)' },
      { module: 'angel-tree-wy-2', selector: '#ATonline ~ .angel-tree-wy-container' },
      { module: 'hero-full-angel-tree', selector: 'div.featured-article:not([id]) > img#hero-full-image:not([srcset])' },
      { module: 'map-angel-tree', selector: '#ATonline:has(#angel-tree-type-toggle)' }
    ]
  },
  {
    path: '/in/anderson/meridian-street-corps/worship/',
    modules: [
      { module: 'become-a-member', selector: '#become-member.become-member' },
      { module: 'donate', selector: '#image-text-button.image-text-button > .ratio-16x9' },
      { module: 'programs-schedule', selector: '#program-schedule.program-schedule[data-component-type="program-schedule"]' },
      { module: 'service-wy', selector: 'div.rounded-5.mb-16.row:not(#service-content-landing) > .col-lg-8.services-body' },
      { module: 'stats-modules', selector: '#stats-module' }
    ]
  },
  {
    path: '/family-services/',
    modules: [
      { module: 'benefits-perks', selector: '.benefits-container .info_card' },
      { module: 'hero-full-donate', selector: '#hero-full.featured-article' }
    ]
  },
  {
    path: '/in/anderson/meridian-street-corps/',
    modules: [
      { module: 'community-leaders', selector: '#community-leaders .leaders-view-leaders-link' },
      { module: 'map-with-info', selector: '#map-with-info[data-component-type="map-with-info"] .map-info__map' },
      { module: 'programs-schedule-landing', selector: '#program-schedule.become-member' },
      { module: 'service-wy-landing', selector: '#service-content-landing .services-body' }
    ]
  },
  {
    path: '/in/anderson/meridian-street-corps/contact-us/',
    modules: [
      { module: 'contact-form', selector: 'div#contact.rounded-5.bg-light.p-8' },
      { module: 'contact-us', selector: '#contact-us.featured-article' },
      { module: 'contact-us-officers', selector: '#contact-us-officers .officer-card' },
      { module: 'faqs', selector: '#faq #accordion-financial-donations' },
      { module: 'map-with-info-contact', selector: '#map-with-info[data-component-type="map-with-info"] .map-with-info-contact__map' }
    ]
  },
  {
    path: '/',
    modules: [
      { module: 'external-links', selector: 'footer a[href*="facebook.com"][data-url][target="_blank"]', visible: false },
      { module: 'hero', selector: '#hero[data-component-type="hero"] #hero-carousel' },
      { module: 'map', selector: '#map[data-component-type="map"] .landing-page__map' },
      { module: 'news', selector: '#news[data-component-type="news"] .news-swiper' },
      { module: 'services', selector: '#services[data-component-type="services"] .services-swiper .service-module-wrapper' },
      { module: 'stats', selector: '#stats[data-component-type="stats"] #stats-carousel-parent' },
      { module: 'client-global-navigation', marker: 'const cookieManager = {' },
      { module: 'indexdb', marker: 'class ServicesSubject' },
      { module: 'schema', marker: 'let jsonLd = {' }
    ]
  },
  {
    path: '/volunteer/',
    modules: [
      { module: 'generic', selector: '#hero-full ~ #generic-info' },
      { module: 'generic-info', selector: '#generic-info .services-body' },
      { module: 'hero-full', selector: '#hero-full.featured-article' }
    ]
  },
  {
    path: '/render-test-page-that-does-not-exist/',
    status: 404,
    modules: [
      { module: 'hero-full-404', selector: '#hero-full-404' }
    ]
  },
  {
    path: '/tx/houston/',
    modules: [
      { module: 'hero-full-cities', selector: 'div.featured-article > img#hero-full-image.states__banner' },
      { module: 'zip-search', selector: '#city-locations-map-wrapper .city-locations__map' }
    ]
  },
  {
    path: '/usa-central-territory/events/',
    modules: [
      { module: 'hero-full-events', selector: 'div.featured-article:not([id]) h1.fs-4.mt-3.mb-2:not(.city-card-name)' },
      { module: 'upcoming-events', selector: '#events[data-component-type="events"] .events-swiper' }
    ]
  },
  {
    path: '/leadership/',
    modules: [
      { module: 'hero-full-leadership', selector: 'div.featured-article:not([id]) > img#hero-full-image:not([srcset])' },
      { module: 'leadership-list', selector: '#community-leaders[data-component-type="community-leaders"] .leaders-list' }
    ]
  },
  {
    path: '/tx/',
    modules: [
      { module: 'hero-full-state', selector: 'div.featured-article > img.states__banner:not(#hero-full-image):not(.contact-us-hero-image)' },
      { module: 'state-list', selector: '#citiesContainer .city-card' }
    ]
  },
  {
    path: '/stuff-the-bus/',
    modules: [
      { module: 'hero-full-stuff-the-bus', selector: 'div.featured-article > img#hero-full-image[srcset][sizes]' },
      { module: 'map-stuff-the-bus', selector: '#ATonline:has(#stb-filterbar)' },
      { module: 'stuff-the-bus-wy', selector: '.stuff-the-bus-wy-container:has(~ #ATonline)' },
      { module: 'stuff-the-bus-wy-2', selector: '#ATonline ~ .stuff-the-bus-wy-container' }
    ]
  },
  {
    path: '/usa-southern-territory/',
    modules: [
      { module: 'image-button-text', selector: '#image-text-button img.image-text-button__img' },
      { module: 'news-cards', selector: '#news-cards[data-component-type="news-cards"] .news-cards-swiper', visible: false }
    ]
  },
  {
    path: '/about-us/',
    modules: [
      { module: 'image-button-text-full', selector: '#image-text-button.become-member' },
      { module: 'local-needs', selector: '#local-needs' }
    ]
  },
  {
    path: '/location-finder/',
    modules: [
      { module: 'location-finder', selector: '#location-finder[data-component-type="location-finder"] #location-finder__input' },
      { module: 'location-finder-script', marker: 'window.servicesByLocationCache = new Map()' }
    ]
  },
  {
    path: '/contact-us/',
    modules: [
      { module: 'map-contact', selector: '[data-component-type="map"] .contact-form__map' }
    ]
  },
  {
    path: '/usa-central-territory/stories/',
    modules: [
      { module: 'news-archive', selector: '.news-archive-search #newsSearchForm' }
    ]
  },
  {
    path: '/stories/the-weekly-word-a-devotion-for-the-week-of-january-22/',
    modules: [
      { module: 'recent-stories', selector: '#recent-stories[data-component-type="recent-stories"] .recent-news-swiper' }
    ]
  },
  {
    path: '/news-tag/',
    modules: [
      { module: 'tags-archive', selector: '.tags-archive-search #tagsSearchForm' }
    ]
  }
];
