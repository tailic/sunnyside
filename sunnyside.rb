CACHE = Dalli::Client.new('localhost:11211', compress: true)

class SunnySide < Sinatra::Base
  helpers Sinatra::JSON
  connections = {}
  
  # the user interface
  
  get '/' do
    erb :index
  end
  
  # endpoint for raster-shading results
  post '/shader-callback/:token' do
    req_id = params[:token]
    response = request.body.read
    waiters = connections[req_id]
    halt 202 if waiters.nil? 
    waiters.each do |out|
      out << "event: shadows\ndata: #{response}\n\n"
      out.close
      CACHE.set(req_id, response)
      connections[req_id].delete(out)
    end
    connections.delete(req_id) if connections[req_id].empty?
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
      out << "event: solarpositions\ndata: #{json(solar_day)}\n\n"

      # Call raster-shading service
      current = solar_day.current_position
      shadow_map = CACHE.get(shadow_map_id(bounding_box, current.azimuth, current.zenith))
      if shadow_map.nil?
        callback_id = RasterShadingClient::ShadowMap.get_shadow_map(current.azimuth, current.zenith, bounding_box, datetime)
        connections.has_key?(callback_id) ? connections[callback_id] << out : connections[callback_id] = [] << out
      else
        out << "event: shadows\ndata: #{shadow_map}\n\n"
        out.close
      end

    end
  end

  def shadow_map_id(bbox, azimuth, zenith)
    "#{bbox.sub(',','')}#{azimuth}#{zenith}"
  end
end