document.addEventListener('DOMContentLoaded', function () {
  function desktopFilter() {
    var accordionButtons = document.querySelectorAll('.accordion-button');

    accordionButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        // Remove active class from all buttons
        accordionButtons.forEach(function (btn) {
          btn.classList.remove('active');
        });

        // Add active class to clicked button if it's not collapsed
        if (!this.classList.contains('collapsed')) {
          this.classList.add('active');
        }
      });
    });

    let filterButtons = document.querySelectorAll('.list-group-item');
    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        let filterValue = this.getAttribute('data-value');
        let filterInput = document.querySelector('input[name="filter"]');
        filterInput.value = filterValue;
        filterInput.dispatchEvent(new Event('change'));
      });
    });

    let zipcodeInput = document.querySelector('.news-zipcode');
    zipcodeInput.addEventListener('input', function () {
      let zipcodeValue = this.value;
      let zipcodeInput = document.querySelector('input[name="zipcode"]');
      zipcodeInput.value = zipcodeValue;
      zipcodeInput.dispatchEvent(new Event('change'));
      aler(zipcodeValue);
    });
  }
  function mobileFilter() {
    const mobileFilter = document.getElementById('mobileFilter');
    const filterTooltip = document.getElementById('filterTooltip');

    mobileFilter.addEventListener('click', function (e) {
      e.preventDefault();
      filterTooltip.style.display = filterTooltip.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function (e) {
      if (!filterTooltip.contains(e.target) && e.target !== mobileFilter) {
        filterTooltip.style.display = 'none';
      }
    });
  }

  function newsSearchViewMoreTracking(index) {
    utag.link({
      event: 'news_search_view_more',
      news_search_term: '',
      news_search_filter_type: '',
      news_search_filter_value: '',
      link_function: 'event',
      link_format: 'icon-block',
      link_text: '',
      link_location: 'body:news component',
      link_type: 'internal'
    });

    utag.link({
      event: 'view_content_click',
      link_function: 'navigation',
      link_format: 'icon-block',
      link_text: '',
      link_location: 'body:[news component]',
      link_url: '',
      link_type: 'internal ',
      page_componentHeading: '',
      page_componentSubheading: '',
      page_componentType: '',
      page_componentIndex: `${index}`
    });
  }

  // var newsSwiper = new Swiper('.news-swiper', {
  //   slidesPerView: 1,
  //   spaceBetween: 16,
  //   loop: false,
  //   pagination: {
  //     el: '.news-swiper__nav .swiper-pagination',
  //     clickable: true
  //   },
  //   navigation: {
  //     nextEl: '.swiper-button-next',
  //     prevEl: '.swiper-button-prev'
  //   },
  //   breakpoints: {
  //     1024: {
  //       slidesPerView: 3
  //     },
  //     768: {
  //       slidesPerView: 2
  //     },
  //     576: {
  //       slidesPerView: 1
  //     },
  //     320: {
  //       slidesPerView: 1
  //     }
  //   }
  // });
  const newsFilter = document.querySelector('.filtersAccordion');
  if (newsFilter) {
    desktopFilter();
    mobileFilter();
  }

  const bullets = document.querySelectorAll('.news-pagination .swiper-pagination-bullet');

  bullets.forEach((bullet, index) => {
    bullet.addEventListener('click', () => {
      newsSearchViewMoreTracking(index);
    });
  });
});
