function wysiwygTracking() {
  const aTags = document.querySelectorAll('.content-analytics a');
  const analyticsNotFound = [];

  aTags.forEach((tag) => {
    const onclickAttribute = tag.getAttribute('onclick');
    const aHref = tag.getAttribute('href');
    if (onclickAttribute) {
      if (!onclickAttribute.includes('LinkTrackingClickEvent')) {
        analyticsNotFound.push(tag);
      }
    } else {
      analyticsNotFound.push(tag);
    }
  });

  if (analyticsNotFound.length > 0) {
    if (window.instanceEnv == 'dev') {
      // alert(`Link tags in your WYSIWYG content are missing some analytic events. We will be applying default "cta_click" event for link tags that has missing events. Please edit your content using this analytics guide https://www.salvationarmyusa.org/`);
      // createModal();
    }

    aTags.forEach((tag) => {
      tag.setAttribute('data-function-type', 'cta');
      tag.setAttribute('data-location-type', 'body');
      tag.setAttribute('data-link-type', 'external');
      tag.setAttribute('onclick', "LinkTrackingClickEvent(this,'cta_click')");
    });
  }
}

function createModal() {
  // Create modal HTML structure
  const modalHTML = `
        <div class="modal fade" id="basicModal" tabindex="-1" aria-labelledby="basicModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="basicModalLabel">Missing Analytics Events</h5>
                    </div>
                    <div class="modal-body">
                        <p>Link tags in your WYSIWYG content are missing some analytic events. We will be applying default <strong>"cta_click"</strong> event for link tags that has missing events. Please edit your content using this analytics guide <a href="https://www.salvationarmyusa.org/">https://www.salvationarmyusa.org/</a></p>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-primary" data-bs-dismiss="modal" onclick="hideModal()">Ok</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Remove existing dynamic modal if it exists
  const existingDynamicModal = document.getElementById('basicModal');
  if (existingDynamicModal) {
    existingDynamicModal.remove();
  }

  const mainContainer = document.getElementsByClassName('main-container')[0];
  if (mainContainer) {
    mainContainer.innerHTML += modalHTML; // Use += to append, not replace

    // Ensure DOM is updated before showing modal
    setTimeout(showModal, 0);
  } else {
    console.error('main-container not found');
  }
}

function showModal() {
  const modal = document.getElementById('basicModal');
  const backdrop = document.createElement('div');
  console.log('Basic Modal', modal);
  // Create backdrop
  backdrop.className = 'modal-backdrop fade show';
  document.body.appendChild(backdrop);

  // Show modal
  modal.style.display = 'block';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  // Store backdrop reference for cleanup
  modal.modalBackdrop = backdrop;
}

function hideModal() {
  const modal = document.getElementById('basicModal');

  // Remove backdrop
  if (modal.modalBackdrop) {
    modal.modalBackdrop.remove();
    delete modal.modalBackdrop;
  }

  // Hide modal
  modal.style.display = 'none';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}
