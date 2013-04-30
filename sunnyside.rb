class SunnySide < Sinatra::Base
  helpers Sinatra::JSON
  register Sinatra::ConfigFile
  config_file 'config/config.yml'

  # Cache Client Connection
  cache_server = ENV['MEMCACHIER_SERVERS'] || settings.cache
  set :cache, Dalli::Client.new(
      cache_server .split(','),
      {
          username: ENV['MEMCACHIER_USERNAME'] || '',
          password: ENV['MEMCACHIER_PASSWORD'] || '',
          compress: true
      }
  )

  set :connections, {}
  
  # the user interface
  get '/' do
    @api_uri = "http://#{request.env['HTTP_HOST']}/api/v1/sunnyside"
    erb :index
  end
  
  # endpoint for raster-shading results
  post '/shader-callback/:token' do
    req_id = params[:token]
    response = request.body.read
    waiters = settings.connections[req_id]
    halt 202 if waiters.nil? 
    waiters.each do |out|
      out << "event: shadows\ndata: #{response}\n\n"
      out.close
      settings.cache.set(req_id, response)
      settings.connections[req_id].delete(out)
    end
    settings.connections.delete(req_id) if settings.connections[req_id].empty?
  end
  
  # returns solarpositions for given day and enqueue raster shading job
  # keeps the stream open until endpoint gets result from worker.
  # TODO Timeout for stream?
  get '/api/v1/sunnyside', provides: 'text/event-stream' do
    stream(:keep_open) do |out|
      # input params
      bounding_box = params[:bbox]
      datetime = params[:datetime]
      bbox_array = bounding_box.split(',')
    
      # get solar positions for the day
      solar_day = SolarInformationClient::SolarDay.get_solar_day(bbox_array[1], bbox_array[0], datetime)
      if solar_day.status == 'OK'
        out << "event: solarpositions\ndata: #{json(solar_day)}\n\n"
        current = solar_day.current_position(datetime)
        shadow_map = settings.cache.get(shadow_map_id(bounding_box, current.azimuth, current.zenith))
        if shadow_map.nil?
          shadow_map = RasterShadingClient::ShadowMap.get_shadow_map(current.azimuth, current.zenith, bounding_box, datetime)
          if shadow_map.status == 'ACCEPTED'
            settings.connections.has_key?(shadow_map.callback_id) ? settings.connections[shadow_map.callback_id] << out : settings.connections[shadow_map.callback_id] = [] << out
          else
            out << "event: error\ndata: #{json(status: shadow_map.status, errors:shadow_map.errors)}\n\n"
            out.close
          end
        else
          out << "event: shadows\ndata: #{shadow_map}\n\n"
          out.close
        end
      else
        out << "event: error\ndata: #{json(status: solar_day.status, errors:solar_day.errors)}\n\n"
        out.close
      end

    end
  end

  def shadow_map_id(bbox, azimuth, zenith)
    "#{bbox.sub(',','')}#{azimuth}#{zenith}"
  end
end