$(document).ready(function() {

  // Set up navigation toggle button clicks
  $('.navbar-toggle').click(function(e) {
    // Toggle active flag for this button and navigation tabs
    $(this).toggleClass('active');
    $('.navbar-tab').toggleClass('active');
  });

  // Set up branding clicks
  $('.navbar-brand').click(function(e) {
    e.preventDefault();  // Override default click behaviour
    // Remove active flag from active tab and corresponding view
    var activeTab = $('.navbar-tab li.active');
    var activeView = $(activeTab.children('a').attr('href'));
    activeView.removeClass('active');
    activeTab.removeClass('active');

    // Add active flag to view that corresponds to this brand
    var thisView = $($(this).attr('href'));
    thisView.addClass('active');

    //Colour to black
    var body = $(thisView.parent().parent());
    body.css('background-color', 'black');
  });

  // Set up navigation tab clicks
  $('.navbar-tab li').click(function(e) {
    e.preventDefault();  // Override default click behaviour

    // Remove active flag from view that corresponds to brand
    $($('.navbar-brand').attr('href')).removeClass('active');

    // Get clicked tab and currently active tab
    var thisTab = $(this);
    var activeTab = $('.navbar-tab li.active');

    // Check if clicked tab is currently active tab
    if (activeTab.is(thisTab)) {
      return;  // Nothing to do
    }

    // Get view that corresponds to active tab
    var activeView = $(activeTab.children('a').attr('href'));
    // Remove active flag from active tab and corresponding view
    activeView.removeClass('active');
    activeTab.removeClass('active');

    // Get view that corresponds to clicked tab
    var thisView = $(thisTab.children('a').attr('href'));
    // Add active flag to clicked tab and corresponding view
    thisTab.addClass('active');
    thisView.addClass('active');

    //Colour back to grey
    var body = $(thisTab.parent().parent().parent());
    body.css('background-color', '#b3b3b3');

  });

    /*=================================get requests==========================================*/

    var baseURL = 'https://api.spacexdata.com/v1/'

    //vehicles get request
    $.ajax({
        url: baseURL + 'vehicles',
        method: 'GET',
        dataType: 'json'
    }).then(data => {
        //simple display of basic information for each vehicle
        $.each(data, function (i,elem){
            var result = $('<li>')
                            .attr('id', elem.id)
                            .addClass('result')
                            .append($('<h3>').text(elem.name))
                            .append($('<p>').text(elem.description));

            var details = $('<ul>').appendTo(result);
            testForProperty(elem, 'active', 'Active', '', '')
            testForProperty(elem, 'first_flight', 'First Flight', '' , '', details)
            testForProperty(elem, 'cost_per_launch', 'Cost Per Launch', '$', '', details)
            testForProperty(elem, 'success_rate_pct', 'Success Rate', '', '%', details)
            //place more info from get request here

            result.appendTo('#vehicles .results')
        })
    }).catch(err => {
        console.log(err)
        alert('Failed to retrieve vehicle data.')
    });

    //launch get request
    $.ajax({
        url: baseURL + 'launches',
        method: 'GET',
        dataType: 'json'
    }).then(data => {
        //simple display of basic information for each launch
        $.each(data, function (i,elem){
            var result = $('<li>')
                            .attr('id', elem.flight_number)
                            .addClass('result')
                            .append($('<h3>').text('Flight Number: ' + elem.flight_number))
                            .append($('<p>').text(elem.details));

            var details = $('<ul>').appendTo(result);
            testForProperty(elem, 'launch_date_utc', 'Launch Date - UTC', '' ,'', details);
            testForProperty(elem, 'launch_date_local', 'Launch Date - Local', '' ,'', details);
            testForProperty(elem, 'launch_success', 'Launch Success', '' ,'', details);

            result.appendTo('#launches .results')
        })
    }).catch(err => {
        console.log(err)
        alert('Failed to retrieve launch data.')
    });

    //launchpads get request
    $.ajax({
        url: baseURL + 'launchpads',
        method: 'GET',
        dataType: 'json'
    }).then(data => {
        //simple display of basic information for each launchpad
        $.each(data, function (i,elem){
            var result = $('<li>')
                            .attr('id', elem.id)
                            .addClass('result')
                            .append($('<h3>').text(elem.full_name))
                            .append($('<p>').text(elem.details));

            var details = $('<ul>').appendTo(result);
            testForProperty(elem, 'status', 'Status', '' ,'', details);
            testForProperty(elem.location, 'name', 'Location Name', '' ,'', details);
            testForProperty(elem.location, 'region', 'Region', '' ,'', details);

            result.appendTo('#launchpads .results')
        })
    }).catch(err => {
        console.log(err)
        alert('Failed to retrieve launchpad data.')
    });
  
})

//helper for formatting get requests
function testForProperty(elem, key, keyName , pre, suf , parent){
    if (elem.hasOwnProperty(key)){
        $('<li>').text(keyName +': '+ pre + elem[key] + suf).appendTo(parent)
    }else{
        $('<li>').text(keyName +': N/A').appendTo(parent)
    }
}

