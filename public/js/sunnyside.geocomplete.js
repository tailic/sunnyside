function Geocomplete(mapSearchField, mapContainer) {
    this.geo_ = this.initPlugin(mapSearchField, mapContainer);
    this.map_ = this.geo_.geocomplete("map");
    this.mapBounds_ = null;
    this.markersArray_ = [];
    this.overlaysArray_ = [];
    this.service_ = new google.maps.places.PlacesService(this.map_);
    this.infowindow_ = new google.maps.InfoWindow();
    this.strictBounds_ = new google.maps.LatLngBounds(
        new google.maps.LatLng(52.415998, 13.3301223),
        new google.maps.LatLng(52.579854, 13.5816187)
    );

}

Geocomplete.prototype.initPlugin = function (mapSearchField, mapContainer) {
    return mapSearchField.geocomplete({
        map: mapContainer,
        mapOptions: {
            zoom: 17,
            maxZoom: 18,
            disableDefaultUI: true,
            zoomControl: false,
            scrollwheel: true,
            scaleControl: false,
            panControl: false,
            mapTypeControl: true,
            center: new google.maps.LatLng(52.52086, 13.4093),
            mapTypeId: "satellite"
        },
        country: 'de',
        types: ["geocode", "amusement_park", "park", "food", "bar", "restaurant", "cafe", "stadium", "cemetery", "university", "zoo"]
    });
}

Geocomplete.prototype.checkBounds = function () {
    if (!this.strictBounds_.contains(this.map_.getCenter())) {
        var C = this.map_.getCenter(),
            X = C.lng(),
            Y = C.lat(),
            AmaxX = this.strictBounds_.getNorthEast().lng(),
            AmaxY = this.strictBounds_.getNorthEast().lat(),
            AminX = this.strictBounds_.getSouthWest().lng(),
            AminY = this.strictBounds_.getSouthWest().lat();
        if (X < AminX) {
            X = AminX
        }
        ;
        if (X > AmaxX) {
            X = AmaxX
        }
        ;
        if (Y < AminY) {
            Y = AminY
        }
        ;
        if (Y > AmaxY) {
            Y = AmaxY
        }
        ;
        this.map_.panTo(new google.maps.LatLng(Y, X));
    }
}

Geocomplete.prototype.showPlaces = function () {
    this.removePlaces();
    var request = {
        bounds: this.mapBounds_,
        rankBy: google.maps.places.RankBy.PROMINENCE,
        types: ["amusement_park", "park", "food", "bar", "restaurant", "cafe", "stadium", "cemetery", "university", "zoo"]
    };

    var map = this.map_,
        markersArray = this.markersArray_,
        infowindow = this.infowindow_;

    this.service_.nearbySearch(request, callback);

    function callback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                createMarker(results[i]);
            }
        }
    }

    function createMarker(place) {
        var placeLoc = place.geometry.location;
        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location
        });
        google.maps.event.addListener(marker, 'click', function () {
            infowindow.setContent(place.name + "<br>" + place.vicinity);
            infowindow.open(map, this);
        });
        markersArray.push(marker);
    }
}

Geocomplete.prototype.removePlaces = function () {
    for (var i = 0; i < this.markersArray_.length; i++) {
        this.markersArray_[i].setMap(null);
    }
    this.markersArray_ = [];
}