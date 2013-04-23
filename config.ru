require 'sinatra'
require 'typhoeus'
require 'multi_json'
require 'json'
require './lib/sinatra/json'
require 'solar-information-client'
require 'raster-shading-client'

require File.expand_path '../sunnyside.rb', __FILE__

set :server, :thin
use Rack::Deflater

# configure the solarinformationservice host
SolarInformationClient::Config.host = '192.168.56.102:9393'
RasterShadingClient::Config.host = '192.168.56.102:9292'

# run app
run SunnySide