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
        # send solarpositions event with results to the stream
        out << "event: solarpositions\ndata: #{json(solar_day)}\n\n"
        # get solarposition based on requested time
        current_position = solar_day.current_position(datetime)
        # try to get ShadowMap from Cache
        shadow_map = settings.cache.get(shadow_map_id(bounding_box, current_position.azimuth, current_position.zenith))
        if shadow_map.nil?
          # ShadowMap was not in Cache tell the cilent to get it
          shadow_map = RasterShadingClient::ShadowMap.get_shadow_map(current_position.azimuth, current_position.zenith, bounding_box, datetime)
          # Accepted means the job was enqued at raster shading service and we keep the stream open until response is back
          if shadow_map.status == 'ACCEPTED'
            settings.connections.has_key?(shadow_map.callback_id) ? settings.connections[shadow_map.callback_id] << out : settings.connections[shadow_map.callback_id] = [] << out
          else
            error_and_close(shadow_map, out)
          end
        # ShadowMap was in Cache send it to the stream and close
        else
          out << "event: shadows\ndata: #{shadow_map}\n\n"
          out.close
        end
      # SolarDay has errors notify the client and close stream
      else
        error_and_close(solar_day, out)
      end

    end
  end

  def error_and_close(client, connection)
    connection << "event: error\ndata: #{json(status: client.status, errors: client.errors)}\n\n"
    connection.close
  end

  def shadow_map_id(bbox, azimuth, zenith)
    "#{bbox.sub(',','')}#{azimuth}#{zenith}"
  end
end