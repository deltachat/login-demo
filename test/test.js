process.env.NODE_ENV = 'test'

const http = require('http')
const chai = require('chai')
const should = chai.should()
chai.use(require('chai-http'))
const sinon = require('sinon')
const clearModule = require('clear-module');

var server = ''

describe("BasicApp: HTTP request", () => {
  // Defined these in this block because we want to mock some functions in
  // other blocks.
  before(() => {
    server = require('http').createServer(require('../src/basicApp')['app'])
  })

  it('to / should respond with code 404', (done) => {
    chai.request(server)
      .get('/')
      .end((err, res) => {
        should.not.exist(err)
        res.should.have.status(404)
        done()
      })
  })

  it('to /checkStatus should respond with code 401', (done) => {
    chai.request(server)
      .get('/checkStatus')
      .end((err, res) => {
        should.not.exist(err)
        res.should.have.status(401)
        done()
      })
  })

  it('to /requestQR should respond with a proper JSON object', (done) => {
    chai.request(server)
      .get('/requestQR')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        Object.keys(res.body).should.eql(['qr_code_data_url', 'qr_data'])
        res.body.qr_code_data_url.should.match(/^data:image\/png;base64,.*/)
        res.body.qr_data.should.include('OPENPGP4FPR:')
        res.body.qr_data.should.include('g=LoginBot%20group%20')
        done()
      })
  })

  it('to /styles.css should respond with the stylesheet', (done) => {
    chai.request(server)
      .get('/styles.css')
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.equal(200)
        res.headers['content-type'].should.include('text/css')
        res.text.length.should.be > 100
        done()
      })
  })
})


describe("OauthApp: HTTP request", () => {
  var saved_auth_code = ''
  var basicApp = ''
  var database = ''

  before(() => {
    // Clear all our modules from the cache, we must load them freshly in order
    // to mock them.
    clearModule.match(/..\/src\//)
    // Mock authentication away.
    basicApp = require('../src/basicApp')
    sinon.stub(basicApp, 'ensureAuthenticated').callsFake((req, res, callback) => { req.session.contactId = 1; callback() })
    // Mock database save and keep the value to test it.
    database = require('../src/database')
    sinon.stub(database, 'insertAuthCode').callsFake((auth_code, contactId) => { saved_auth_code = auth_code })

    server = require('http').createServer(require('../src/oauthApp')['app'])
  })

  it('to /oauth2/authorize should respond with redirect if client_id and redirect_uri are valid', (done) => {
    chai.request(server)
      .get('/oauth2/authorize?client_id=aRandomString&redirect_uri=http://localhost/callback')
      .redirects(0) // don't follow the redirect
      .end((err, res) => {
        should.not.exist(err)
        res.status.should.eql(302)
        res.header.location.should.include('http://localhost/callback')

        let match = res.header.location.match(/code=(\w+)/)
        should.exist(match)
        match[1].should.eql(saved_auth_code)

        done()
      })
  })

  after(() => sinon.restore())
})
