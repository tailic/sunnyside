require 'sinatra'
require 'sinatra/config_file'
require 'typhoeus'
require 'dalli'
require 'multi_json'
require 'json'
require 'yaml'
require './lib/sinatra/json'
require 'solar-information-client'
require 'raster-shading-client'

config = YAML.load_file('config/config.yml')
SolarInformationClient::Config.host = ENV['SOLAR_SERVICE_HOST'] || config['development']['solar_service_host']
RasterShadingClient::Config.host = ENV['SHADING_SERVICE_HOST'] || config['development']['shading_service_host']

require File.expand_path '../../sunnyside.rb', __FILE__