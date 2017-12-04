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

// records message ids so it wont prepend duplicates on repeat
var record = [];

//initial get for page loading
$.ajax({
    url: '/api/messages',
    method: 'GET',
    dataType: 'json'
      }).then(data => {
        $.each(data, function (i,elem){

          var dont_push = 0;

          //initial push on entering website
          for (index in record){
            if (record[index] == elem.id){
              dont_push = 1;
            }
          }
          if (dont_push == 0){
            record.push(elem.id);
          }

            var result = $('<div>')
              //.attr('id', elem.id)
              .addClass('message')
              .text(elem.data);

              result.prependTo('.tab-view');
              
          })

      }).catch(err => {
        console.log(err)
  })

// Repeated Ajax call for newly posted messages 
function refreshMessages(){
  $.ajax({
    url: '/api/messages',
    method: 'GET',
    dataType: 'json'
      }).then(data => {
        $.each(data, function (i,elem){

          var message_present = 0;

          // Detect if message is already prepended
          for(index in record){
            if (record[index] == elem.id){
              message_present = 1;
            }
          }

          // Prepend only if the message hasn't been prepended before
          if (message_present == 0){
            record.push(elem.id);
                var result = $('<div>')
                    //.attr('id', elem.id)
                    .addClass('message')
                    .text(elem.data);

                result.prependTo('.tab-view');
              }
            })

      }).catch(err => {
        console.log(err)
    })
}

// Repeated ajax calls every X seconds. (second argument is in milliseconds)
setInterval(refreshMessages, 5000);

})
