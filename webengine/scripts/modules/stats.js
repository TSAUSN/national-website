const statFilters = document.querySelectorAll('.stats-filter .nav-link');

for (let i = 0; i < statFilters.length; i++) {
  statFilters[i].addEventListener('click', (event) => {
    if (!statFilters[i].classList.contains('active') && statFilters[i].contains(event.target)) {
      for (let i = 0; i < statFilters.length; i++) {
        if (statFilters[i].classList.contains('active')) {
          statFilters[i].classList.remove('active');
          statFilters[i].classList.add('text-dark-50');
          break;
        }
      }
      statFilters[i].classList.add('active');
      statFilters[i].classList.remove('text-dark-50');
    }
  });
}
