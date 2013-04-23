$(function() {

// Global Vars & Initialize
  var mapContainer = $('#map'),
      mapSearchField = $("#inputLocation"),
      dateField = $('#inputDate'),
      solarRaysContainer = $('#sunrays'),
      timeSliderContainer = $('#timeslider'),
      solarTimeSelect = $("#times"),
      gc = new Geocomplete(mapSearchField, mapContainer),
      map = gc.map_,
      notInitialized = true,
      minZoom = 17,
      shadowOverlays = {},
      hasMarkers = false,
      showMarkers = false;

  $('.toggle-sun').click(function(){
    $(this).toggleClass('active');
    solarRaysContainer.toggle();
    timeSliderContainer.children().toggle();
  });

  $('.toggle-shadow').click(function(){
      $(this).toggleClass('active');
    $('svg').toggle();
  });

  $('.toggle-places').click(function(){
      if(!hasMarkers) gc.showPlaces();
      $(this).toggleClass('active');
      $.each(gc.markersArray_, function(){
        showMarkers ? this.setVisible(false) :  this.setVisible(true);
      });
      showMarkers = !showMarkers;
      hasMarkers = true;
  });


  var datepicker = dateField.datepicker({
        language: 'de',
        format: 'dd.mm.yyyy',
        todayHighlight: true,
        autoclose: true
      })
      .on('changeDate', function(ev){
        var hour = moment().hour();
        var date = moment(ev.date).hour(hour).format("YYYY-MM-DDTHH:mm:ssZ");
        getSolarpositions(date);
      });

  gc.geo_.bind("geocode:result", function(event, result){
    var date = moment(datepicker.val(), 'YY.MM.DD');
    var hour = moment().hour();
    //var hour = solarTimeSelect.val();
    getSolarpositions(date.hour(hour).format("YYYY-MM-DDTHH:mm:ssZ"));
  });


  var getSolarpositions = function(date){
      $('body').append('<div id="loading"></div>');
      $('#loading').spin({color: 'orange'});

      //clear cache for old position TODO Check ist position is really new
      $.each(shadowOverlays, function() {
          this.setMap(null);
          if(this instanceof Array) {
              $.each(this, function(){
                  this.setMap(null);
              });
          }
      });
      shadowOverlays = {};

      var maxX = gc.map_.getBounds().getNorthEast().lng(),
          maxY = gc.map_.getBounds().getNorthEast().lat(),
          minX = gc.map_.getBounds().getSouthWest().lng(),
          minY = gc.map_.getBounds().getSouthWest().lat();

      var uri = "http://192.168.56.102:9494/api/v1/sunnyside?bbox="+minX+","+minY+","+maxX+","+maxY+"&datetime=" + encodeURIComponent(date);
      var es = new EventSource(uri);

      es.onmessage = function(e) {
          //es.close();
      };

      es.addEventListener('shadows', function(e) {
          var data = JSON.parse(e.data);
          drawShadowOverlay(data.shadow_map.boundingbox, data.shadow_map.svg);
          es.close();
      }, false);

      es.addEventListener('solarpositions', function(e) {
          var data = JSON.parse(e.data);
          drawSolarOverlay(data.solar_day.solarpositions);
          $('#loading').remove();
      }, false);
  }

    var getShadow = function(date){
        $('body').append('<div id="loading"></div>');
        $('#loading').spin({color: 'orange'});
        if(shadowOverlays[moment(date).hours()]) {
            var cache = shadowOverlays[moment(date).hours()];
            drawShadowOverlay(cache.bbox, cache.svg, cache);
            return;
        }

        var maxX = gc.map_.getBounds().getNorthEast().lng(),
            maxY = gc.map_.getBounds().getNorthEast().lat(),
            minX = gc.map_.getBounds().getSouthWest().lng(),
            minY = gc.map_.getBounds().getSouthWest().lat();

        var uri = "http://192.168.56.102:9494/api/v1/sunnyside?bbox="+minX+","+minY+","+maxX+","+maxY+"&datetime=" + encodeURIComponent(date);
        var es = new EventSource(uri);

        es.addEventListener('shadows', function(e) {
            var data = JSON.parse(e.data);
            drawShadowOverlay(data.shadow_map.boundingbox, data.shadow_map.svg, null);
            es.close();
        }, false);
    }

  var drawSolarOverlay = function(solarpositions) {
    var solar_overlay = new SolarOverlay(solarRaysContainer, solarpositions, solarTimeSelect);
    solar_overlay.drawRays();
    solar_overlay.drawUI();
  }

  var drawShadowOverlay = function(bbox, svg, cached_overlay) {

    $.each(shadowOverlays, function() {
      this.setMap(null);
        if(this instanceof Array) {
          $.each(this, function(){
            this.setMap(null);
          });
        }
    });

    if(cached_overlay != null) {
        cached_overlay.setMap(map);
        $('#loading').remove();
        return
    }

    var bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(bbox.bottom,bbox.left),
      new google.maps.LatLng(bbox.top, bbox.right)
    );

    var shadow_overlay = new ShadowOverlay(bounds, svg, map, 255);
      shadowOverlays[solarTimeSelect.val()] = shadow_overlay
      $('#loading').remove();
  }


    solarTimeSelect.change(function() {
        var date = moment(datepicker.val(), 'YY.MM.DD');
        var hour = $(this).val();
        getShadow(date.hour(hour).format("YYYY-MM-DDTHH:mm:ssZ"));
    });


// Google Maps Event Listeners
  google.maps.event.addListener(map, 'bounds_changed', function() {
    gc.mapBounds_ = map.getBounds();
    if(notInitialized) getSolarpositions(moment().format("YYYY-MM-DDTHH:mm:ssZ"));
    notInitialized = false;
  });

  google.maps.event.addListener(map, 'dragstart', function() {

  });

  google.maps.event.addListener(map, 'dragend', function() {
    gc.checkBounds(map.getCenter());
  });

  google.maps.event.addListener(map, 'resize', function() {

  });

  google.maps.event.addListener(map, 'zoom_changed', function() {
    if (map.getZoom() < minZoom) map.setZoom(minZoom);
  });



});
