$(function () {

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
        currentZoom = 17,
        shadowOverlays = {},
        hasMarkers = false,
        showMarkers = false,
        apiURI = $('body').data('api-uri');

    $('.toggle-sun').click(function () {
        $(this).toggleClass('active');
        solarRaysContainer.toggle();
        timeSliderContainer.children().toggle();
    });

    $('.toggle-shadow').click(function () {
        $(this).toggleClass('active');
        $('svg').toggle();
    });

    $('.toggle-places').click(function () {
        if (!hasMarkers) gc.showPlaces();
        $(this).toggleClass('active');
        $.each(gc.markersArray_, function () {
            showMarkers ? this.setVisible(false) : this.setVisible(true);
        });
        showMarkers = !showMarkers;
        hasMarkers = true;
    });

    //
    var datepicker = dateField.datepicker({
        language: 'de',
        format: 'dd.mm.yyyy',
        todayHighlight: true,
        autoclose: true
    })
        .on('changeDate', function (ev) {
            var hour = solarTimeSelect.val();
            var date = moment(ev.date).hour(hour).format("YYYY-MM-DDTHH:mm:ssZ");
            getSolarpositions(date);
        });

    //
    gc.geo_.bind("geocode:result", function (event, result) {
        var date = moment(datepicker.val(), 'DD.MM.YYYY');
        //var hour = moment().hour();
        var hour = solarTimeSelect.val();
        getSolarpositions(date.hour(hour).format("YYYY-MM-DDTHH:mm:ssZ"));
    });

    //
    $("#map").on("click", "#refreshshadows", function (event) {
        var date = moment(datepicker.val(), 'DD.MM.YYYY');
        //var hour = moment().hour();
        var hour = solarTimeSelect.val();
        date = date.hour(hour).format("YYYY-MM-DDTHH:mm:ssZ")
        getSolarpositions(date);
        $(this).fadeOut();
    });

    //
    var getSolarpositions = function (date) {
        $('body').append('<div id="loading"></div>');
        $('#loading').spin({color: 'orange'});

        //TODO Check if position is really new
        hideShadowOverlays();
        shadowOverlays = {};

        var maxX = gc.map_.getBounds().getNorthEast().lng(),
            maxY = gc.map_.getBounds().getNorthEast().lat(),
            minX = gc.map_.getBounds().getSouthWest().lng(),
            minY = gc.map_.getBounds().getSouthWest().lat();

        var uri = apiURI + "?bbox=" + minX + "," + minY + "," + maxX + "," + maxY + "&datetime=" + encodeURIComponent(date);
        var es = new EventSource(uri);

        es.onmessage = function (e) {
            //es.close();
        };
        es.addEventListener('error', function (e) {
            var data = JSON.parse(e.data);
            console.log(data);
            $("#alert").html('<div class="alert">' +
                '<a class="close" data-dismiss="alert">×</a>' +
                '<h4>Oh snap!</h4><p>'+errorMessages[data.status]+'</p>' +
                '<p><a href="#" class="btn btn-success">Nochmal versuchen!</a></p>' +
                '</div>')
            es.close();
        }, false);

        es.addEventListener('shadows', function (e) {
            var data = JSON.parse(e.data);
            drawShadowOverlay(data.shadow_map.boundingbox, data.shadow_map.svg, data.shadow_map.azimuth);
            es.close();
        }, false);

        es.addEventListener('solarpositions', function (e) {
            var data = JSON.parse(e.data);
            drawSolarOverlay(data.solarpositions);
        }, false);
    }

//
    var getShadow = function (date) {
        $('body').append('<div id="loading"></div>');
        $('#loading').spin({color: 'orange'});
        if (shadowOverlays[moment(date).hours()]) {
            var cache = shadowOverlays[moment(date).hours()];
            drawCachedShadowOverlay(cache);
            return;
        }

        var maxX = gc.map_.getBounds().getNorthEast().lng(),
            maxY = gc.map_.getBounds().getNorthEast().lat(),
            minX = gc.map_.getBounds().getSouthWest().lng(),
            minY = gc.map_.getBounds().getSouthWest().lat();

        var uri = apiURI + "?bbox=" + minX + "," + minY + "," + maxX + "," + maxY + "&datetime=" + encodeURIComponent(date);
        var es = new EventSource(uri);

        es.addEventListener('error', function (e) {
            var data = JSON.parse(e.data);
            console.log(data);
            es.close();
        }, false);

        es.addEventListener('shadows', function (e) {
            var data = JSON.parse(e.data);
            drawShadowOverlay(data.shadow_map.boundingbox, data.shadow_map.svg, data.shadow_map.azimuth);
            es.close();
        }, false);
    }

//
    var drawSolarOverlay = function (solarpositions) {
        var solar_overlay = new SolarOverlay(solarRaysContainer, solarpositions, solarTimeSelect);
        solar_overlay.drawRays();
        solar_overlay.drawUI();
    }


//
    var drawCachedShadowOverlay = function (cached_overlay) {
        hideShadowOverlays();
        cached_overlay.setMap(map);
        $('#loading').remove();
    }

//
    var drawShadowOverlay = function (bbox, svg, azimuth) {
        var hour = $("#sunrays .sunray[data-azimuth='" + azimuth + "']").data("hour"),
            bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(bbox.bottom, bbox.left),
                new google.maps.LatLng(bbox.top, bbox.right)
            );
        if (typeof shadowOverlays[hour] == 'undefined') shadowOverlays[hour] = new ShadowOverlay(bounds, svg, map, 255);
        if (hour == solarTimeSelect.val()) {
            hideShadowOverlays();
            shadowOverlays[hour].setMap(map);
            $('#loading').remove();
        }
    }

//
    var hideShadowOverlays = function () {
        $.each(shadowOverlays, function () {
            this.setMap(null);
            if (this instanceof Array) {
                $.each(this, function () {
                    this.setMap(null);
                });
            }
        });
    }

//
    solarTimeSelect.change(function () {
        var date = moment(datepicker.val(), 'DD.MM.YYYY');
        var hour = $(this).val();
        getShadow(date.hour(hour).format("YYYY-MM-DDTHH:mm:ssZ"));
    });

    //
    var showRefresher = function () {
        var refresher = $("#refreshshadows");
        if (refresher.length > 0) {
            refresher.fadeIn();
        } else {
            $('#map').append('<div id="refreshshadows"><button class="btn btn-inverse" type="button"><i class="icon-refresh icon-white"></i> Schatten berechnen</button></div>');
            refresher.hide().fadeIn()
        }
    }

// Google Maps Event Listeners
    google.maps.event.addListener(map, 'bounds_changed', function () {
        gc.mapBounds_ = map.getBounds();
        if (notInitialized) getSolarpositions(moment().format("YYYY-MM-DDTHH:mm:ssZ"));
        notInitialized = false;
    });

    google.maps.event.addListener(map, 'dragstart', function () {
    });

    google.maps.event.addListener(map, 'dragend', function () {
        gc.checkBounds(map.getCenter());
        showRefresher();
        if (showMarkers) gc.showPlaces();
    });

    google.maps.event.addListener(map, 'resize', function () {

    });

    google.maps.event.addListener(map, 'zoom_changed', function () {
        if (map.getZoom() < minZoom) map.setZoom(minZoom);
        if (map.getZoom() < currentZoom) {
            showRefresher();
            gc.showPlaces();
        }
        currentZoom = map.getZoom();
    });


});
