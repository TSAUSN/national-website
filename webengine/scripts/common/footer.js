const buttonAccordion = document.querySelector('#mobileAccordion .accordion-button');
const accordionIcon = buttonAccordion.querySelector('i');
let accordionState = false;

buttonAccordion.addEventListener('click', () => {
  accordionState = !accordionState;

  if (accordionState) {
    accordionIcon.innerHTML = 'remove';
  } else {
    accordionIcon.innerHTML = 'add';
  }
});

const buttonAccordion2 = document.querySelector('#mobileAccordion2 .accordion-button');

const accordionIcon2 = buttonAccordion2.querySelector('i');
let accordionState2 = false;

buttonAccordion2.addEventListener('click', () => {
  accordionState2 = !accordionState2;

  if (accordionState2) {
    accordionIcon2.innerHTML = 'remove';
  } else {
    accordionIcon2.innerHTML = 'add';
  }
});

const newsletterBtn = document.querySelector('#newsletterModalBtn');
const newsletterContainer = document.querySelector('#newsletter-container');
const newsletterCloseBtn = document.querySelector('.newsletter-modal-close-button');

newsletterBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  newsletterContainer.classList.toggle('active');
});
newsletterCloseBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  donateContainer.classList.remove('active');
});
