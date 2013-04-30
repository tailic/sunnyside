require './config/boot'
require 'cgi'
require 'rack/test'

set :environment, :test

describe 'SunnySide Service API' do
  include Rack::Test::Methods

  def app
    SunnySide
  end

  # Valid JSON Response
  shared_examples 'a valid stream response' do
    it 'response with content-type json' do
      requested
      last_response.headers['content-type'] == 'text/event-stream'
    end

    it 'contains valid json in data blocks' do
      requested
      datas = last_response.body.gsub(/^event: (solarpositions|shadows|error){1}\ndata: /, '').split(/\n\n/)
      datas.each { |data| valid_json?(data).should be_true }
    end
  end

  # Valid Request
  context 'given valid request parameters' do
    let(:valid_bounding_box) { '13.403023630905183,52.519358487831745,13.415576369094879,52.522361460850576' }
    let(:valid_datetime) { CGI::escape '2013-04-29T18:40:54+02:00' }
    let(:valid_request) { get "/api/v1/sunnyside?bbox=#{valid_bounding_box}&datetime=#{valid_datetime}" }
    let(:expected_result) { /^event: (solarpositions|shadows){1}\ndata: / }

    it_behaves_like 'a valid stream response' do
      let(:requested) { valid_request }
    end

    it 'has status code 200' do
      valid_request
      last_response.status.should be == 200
    end

    it 'returns expected results' do
      valid_request
      last_response.body.should =~ expected_result
    end
  end

  # Invalid Request
  context 'given invalid request parameters' do
    let(:invalid_bounding_box) { '13.423023630905183,52.519358487831745,13.415576369094879,52.522361460850576' }
    let(:invalid_datetime) { CGI::escape '2013-03-17T190:20:01+01:00' }
    let(:invalid_request) { get "/api/v1/sunnyside?bbox=#{invalid_bounding_box}&datetime=#{invalid_datetime}" }
    let(:expected_result) { "event: error\ndata: {\"status\":\"VALIDATION_FAILED\",\"errors\":{\"datetime\":[\"INVALID_DATETIME\"]}}\n\n" }

    it_behaves_like 'a valid stream response' do
      let(:requested) { invalid_request }
    end

    it 'responds with status code 200' do
      invalid_request
      last_response.status.should be == 200
    end

    it 'returns expected results' do
      invalid_request
      last_response.body.should eq expected_result
    end
  end

end


def valid_json?(json)
  JSON.parse(json)
  return true
  rescue JSON::ParserError
    return false
end