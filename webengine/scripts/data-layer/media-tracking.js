function videoEvents(el, eventName) {
  // Base video data
  const videoData = {
    event: eventName,
    video_name: el.getAttribute('data-video-name-type') || null,
    video_url: el.getAttribute('data-video-url-type') || null,
    video_length: el.getAttribute('data-video-length-type') || null,
    video_current_time: el.getAttribute('data-video-current-time-type') || null,
    video_content_type: el.getAttribute('data-video-content-type-type') || null
  };

  // Conditionally add progress percentage
  const videoProgressPercent = el.getAttribute('data-video-progress-percent-type');
  if (videoProgressPercent) {
    videoData.video_progress_percent = videoProgressPercent;
  }

  // Send tracking data
  utag.link(videoData);
}

function videoEvents(el, eventName) {
  const source = el.querySelector('source');

  const data = {
    event: eventName,
    video_name: el.getAttribute('data-video-name') || null,
    video_url: source.getAttribute('src') || null,
    video_length: Math.floor(el.duration).toString() || null,
    video_content_type: el.getAttribute('data-video-content-type') || 'Annual Report'
  };

  if (
    eventName === 'video_pause' ||
    eventName === 'video_resume' ||
    eventName === 'video_progress'
  ) {
    data['video_current_time'] = el.currentTime.toString();
  }

  if (eventName === 'video_progress') {
    const currentPercentage = (el.currentTime / el.duration) * 100;
    data['video_progress_percent'] = Math.floor(currentPercentage).toString();
  }

  utag.link(data);
}
