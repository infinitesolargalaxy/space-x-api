$(document).ready(function() {
  // Click navigation toggle button to open/close drop-down
  $('.navbar-toggle').click(function(e) {
    e.stopPropagation();  // Don't allow click event to bubble up

    // Toggle active flag for this button and navigation tabs
    $(this).toggleClass('active');
    $('.navbar-tab').toggleClass('active');
  });

  // Clicking anywhere will cause drop-down to close
  $('body').click(function(e) {
    // Remove active flag from navigation toggle button and navigation tabs
    $('.navbar-toggle').removeClass('active');
    $('.navbar-tab').removeClass('active');
  });

  // Click brand to switch to home page
  $('.navbar-brand').click(function(e) {
    // Remove active flag from active tab
    $('.navbar-tab li.active').removeClass('active');
  });

  // Click navigation tab to switch to that tab
  $('.navbar-tab li').click(function(e) {
    // Remove active flag from active tab
    $('.navbar-tab li.active').removeClass('active');
    // Add active flag to clicked tab 
    $(this).addClass('active');
  });
})
