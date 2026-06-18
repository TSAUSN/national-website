const searchContainer = document.getElementById('header-search-container');
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchContainerCloseBtn = document.querySelector('.search-modal-close-button');
const ctaBtns = document.querySelector('.header-cta-buttons');
const searchCloseBtn = document.querySelector('.header-search-close-button');

const toggleSearchIcon = () => {
  searchToggleBtn.querySelector('span').classList.toggle('text-primary-200');
  searchToggleBtn.querySelector('span').classList.toggle('text-dark-100');
};

searchToggleBtn.addEventListener('click', (event) => {
  event.stopPropagation();

  searchContainer.classList.toggle('active');
  searchCloseBtn.classList.toggle('active');
  ctaBtns.classList.toggle('active');
  findHelpContainer.classList.remove('active');
  donateContainer.classList.remove('active');

  toggleSearchIcon();

  if (searchContainer.classList.contains('active') && window.innerWidth < 992) {
    document.body.style.overflowY = 'hidden';
  } else {
    document.body.style.overflowY = 'visible';
  }
});

searchContainerCloseBtn.addEventListener('click', (event) => {
  event.stopPropagation();

  searchContainer.classList.toggle('active');
  toggleSearchIcon();
});

searchCloseBtn.addEventListener('click', (event) => {
  event.stopPropagation();

  searchContainer.classList.toggle('active');
  searchCloseBtn.classList.toggle('active');
  ctaBtns.classList.toggle('active');
  findHelpContainer.classList.remove('active');
  donateContainer.classList.remove('active');
  toggleSearchIcon();

  if (searchContainer.classList.contains('active')) {
    document.body.style.overflowY = 'hidden';
  } else {
    document.body.style.overflowY = 'visible';
  }
});

const findHelpContainer = document.getElementById('header-help-container');
const findHelpBtns = document.querySelectorAll('.header-find-help-btn');
const helpCloseBtn = document.getElementById('help-close-btn');
const body = document.querySelector('body');

const headerDropdowns = document.querySelectorAll('.header-dropdown');

headerDropdowns.forEach((dropdown) => {
  dropdown.addEventListener('click', () => {
    findHelpContainer.classList.remove('active');
  });
});

findHelpBtns.forEach((findHelpBtn) => {
  findHelpBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    navMenu.style.transform = 'unset';
    navMenu.classList.remove('active');
    if (searchContainer.classList.contains('active')) {
      searchContainer.classList.remove('active');
      body.classList.remove('is-open-modal');

      searchToggleBtn.querySelector('span').classList.toggle('text-primary-200');
      searchToggleBtn.querySelector('span').classList.toggle('text-dark-100');
    }

    headerDropdowns.forEach((dropdown) => {
      dropdown.classList.remove('show');
      dropdown.nextElementSibling.classList.remove('show');
    });

    if (donateContainer.classList.contains('active')) {
      donateContainer.classList.remove('active');
      body.classList.remove('is-open-modal');
    }

    findHelpContainer.classList.toggle('active');
    body.classList.toggle('is-open-modal');
  });
});

helpCloseBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  body.classList.remove('is-open-modal');
  findHelpContainer.classList.remove('active');
});

const donateContainer = document.getElementById('header-donate-container');

function getCookieByName(name) {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + '=')) {
      const value = cookie.substring(name.length + 1);
      return decodeURIComponent(value); // Decode the URL-encoded value
    }
  }

  return null;
}

const cloader = document.getElementById('donation-loader-container');
let iframe = null;

function openDonateModal(donateUrl) {
  const donateModalElement = document.getElementById('donateModal');
  const iframeContainer = document.querySelector('.donation-iframe-container');

  if (!donateModalElement || !iframeContainer || typeof bootstrap === 'undefined' || !bootstrap.Modal) {
    window.location.href = donateUrl;
    return;
  }

  if (cloader) {
    cloader.classList.remove('d-none');
  }

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.title = 'Donation form';
    iframe.className = 'w-100 h-100 border-0';
    iframe.setAttribute('allowpaymentrequest', 'true');
    iframe.addEventListener('load', () => {
      if (cloader) {
        cloader.classList.add('d-none');
      }
    });
    iframeContainer.appendChild(iframe);
  }

  iframe.src = donateUrl;
  bootstrap.Modal.getOrCreateInstance(donateModalElement).show();
}

window.openDonateModal = openDonateModal;

document.addEventListener('click', (event) => {
  const donateBtn = event.target.closest('.header-donate-button');
  if (!donateBtn) return;

  event.preventDefault();
  event.stopPropagation();
  navMenu.style.transform = 'unset';
  navMenu.classList.remove('active');
  if (searchContainer.classList.contains('active')) {
    searchContainer.classList.remove('active');

    searchToggleBtn.querySelector('span').classList.toggle('text-primary-200');
    searchToggleBtn.querySelector('span').classList.toggle('text-dark-100');
  }

  headerDropdowns.forEach((dropdown) => {
    dropdown.classList.remove('show');
    dropdown.nextElementSibling.classList.remove('show');
  });

  if (findHelpContainer.classList.contains('active')) {
    findHelpContainer.classList.remove('active');
  }

  const desktopDonateDrawerContainer = document.querySelector('#header-donate-drawer');

  if (desktopDonateDrawerContainer.classList.contains('active')) {
    if (typeof window.forceCloseDonationDrawer === 'function') {
      window.forceCloseDonationDrawer();
    } else {
      desktopDonateDrawerContainer.classList.remove('active');
    }
  } else {
    if (typeof window.forceOpenDonationDrawer === 'function') {
      window.forceOpenDonationDrawer();
    } else {
      desktopDonateDrawerContainer.classList.add('active');
    }
  }
});

document.addEventListener('click', (event) => {
  if (!searchContainer.contains(event.target) && !searchToggleBtn.contains(event.target)) {
    if (searchContainer.classList.contains('active')) {
      searchContainer.classList.remove('active');

      searchToggleBtn.querySelector('span').classList.toggle('text-primary-200');
      searchToggleBtn.querySelector('span').classList.toggle('text-dark-100');
    }
  }

  // if (!findHelpContainer.contains(event.target) && !findHelpBtn.contains(event.target)) {
  //   findHelpContainer.classList.remove('active');
  // }

  if (!donateContainer.contains(event.target)) {
    donateContainer.classList.remove('active');
  }
});

const searchInput = document.getElementById('search-input');
const searchInputClearBtn = document.getElementById('search-input-clear-btn');

searchInput.addEventListener('keyup', (event) => {
  if (searchInput.value.length > 0) searchInputClearBtn.classList.remove('hide');
  else searchInputClearBtn.classList.add('hide');
});

searchInputClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchInputClearBtn.classList.add('hide');
});

const nextBtn = document.getElementById('header-next-btn');
const prevBtn = document.getElementById('header-prev-btn');

nextBtn.addEventListener('click', () => {
  swiper.slideNext(400);
});
prevBtn.addEventListener('click', () => {
  swiper.slidePrev(400);
});

const currentLanguageText = document.querySelector('.current-language-text');

function showItems(item) {
  currentLanguageText.innerHTML = item.innerHTML;
}

const languages = document.querySelectorAll('.language-item');

// biome-ignore lint/complexity/noForEach: <explanation>
languages.forEach((language) => {
  language.addEventListener('click', () => {
    showItems(language);
  });
});
