function SolarOverlay(raysContainer, solarpositions, timeSelect) {
  this.raysContainer_ = raysContainer;
  this.solarpositions_ = solarpositions;
  this.timeSelect_ = timeSelect;
  this.rays_ = null;
  this.initValues();
 }

 SolarOverlay.prototype.initValues = function() {
  timeSelect = this.timeSelect_;
  raysContainer = this.raysContainer_;

     //cleanup
     raysContainer.empty();
     timeSelect.empty();
     $('#slide').remove();

     //
  var currDate = new Date();
  var currMin = currDate.getMinutes();
  var currHour = currDate.getHours();
  var hour = currMin > 30 ? currHour + 1 : currHour;
  jQuery.each(this.solarpositions_, function(index, position){
    var position = position.solar_position;
    var active = position.hour === hour ? "active" : "";
    var time = position.hour
      $('<div/>', {
          'class': 'sunray ' + active,
          'data-azimuth': position.azimuth,
          'data-angle': position.azimuth - 90,
          'data-hour': position.hour
      }).appendTo(raysContainer);
      var selected = position.hour === hour ? "selected=selected" : "";
      timeSelect.append("<option value='" + time + "'" + selected + ">"+time+":00</option>")
  });
  if($('.sunray.active').length == 0) $('.sunray').first().addClass('active');
  this.rays_ = $('.sunray');
 }


 SolarOverlay.prototype.drawUI = function() {
  var select = this.timeSelect_,
      selectOptions = select.children(),
      rays = this.rays_;
  var slider = $( "<div id='slide'></div>" ).insertAfter( select ).slider({
      min: 1,
      max: selectOptions.length,
      value: select[ 0 ].selectedIndex + 1,
      slide: function( event, ui ) {
          select[0].selectedIndex = ui.value - 1;
          rays.removeClass('active');
          rays.eq(ui.value - 1).addClass('active');
      },
      stop: function ( event, ui ) {
          select.trigger('change');
      }
  });

  var scale = slider.append('<ol class="ui-slider-scale ui-helper-reset" role="presentation"></ol>').find('.ui-slider-scale:eq(0)');
  jQuery(selectOptions).each(function(i){
    var style = (i == selectOptions.length-1 || i == 0) ? 'style="display: none;"' : '' ;
    scale.append('<li style="left:'+ leftVal(i) +'"><span class="ui-slider-label ui-slider-label-show">'+ this.text +'</span><span class="ui-slider-tic ui-widget-content"'+ this.text +'></span></li>');
  });

  function leftVal(i){
    return (i/(selectOptions.length-1) * 100).toFixed(2)  +'%';
  }

  select.change(function() {
      var index = this.selectedIndex;
      slider.slider( "value", index + 1 );
  });

 }

 SolarOverlay.prototype.drawRays = function() {
  var container = this.raysContainer_,
      rays = this.rays_,
      radius = 250,
      width = container.width(), height = container.height();

  rays.each(function() {
      var angle_deg = $(this).data('angle'),
          angle = Math.radians(angle_deg),
          x = Math.round(width/2 + radius * Math.cos(angle) - $(this).width()/2),
          y = Math.round(height/3 + radius * Math.sin(angle) - $(this).height()/2);

      $(this)
        .css({ left: x + 'px', top: y + 'px' })
        .rayRotate((angle_deg + 90) % 360);
  });
 }