require 'sinatra'
require 'typhoeus'
require 'dalli'
require 'multi_json'
require 'json'
require './lib/sinatra/json'
require 'solar-information-client'
require 'raster-shading-client'

require File.expand_path '../sunnyside.rb', __FILE__

# configure the solarinformationservice host
SolarInformationClient::Config.host = 'solar-information-service.herokuapp.com'
RasterShadingClient::Config.host = 'raster-shading-service.herokuapp.com'

# run app
run SunnySide