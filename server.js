
/*!
 * Tabloro
 * Copyright(c) 2014 Franky Trigub frankyyyy@live.com
 * 
 */
/**
 * Module dependencies
 */
/*
 * to direct port 80 and 443 to our ports add these two lines to  /etc/rc.local  for reboot and run directly using sudo for immediate application:
 * iptables -t nat -A PREROUTING -i venet0 -p tcp --dport 80 -j REDIRECT --to-port 4000
 * iptables -t nat -A PREROUTING -i venet0 -p tcp --dport 443 -j REDIRECT --to-port 3000
 */

/*
 * 
 * 
 * Modify node_modules/eurica.io/lib/EurecaServer.js:1203  getUrl(req)  scheme  http  -> https
 * 
 * 
 */

var log = console.log;

log(process.env.NODE_ENV);
var fs = require('fs');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport');
var config = require('config');
var R = require('ramda');
var EurecaServer = require('eureca.io').EurecaServer;

// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/localhost/privkey.pem', 'utf8');  //change localhost here to your.server.com ?
const certificate = fs.readFileSync('/etc/letsencrypt/live/localhost/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/localhost/chain.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};

const { ExpressPeerServer } = require('peer');


var app = express();
var port = process.env.PORT || 3000;
var https_port = 4000;
var https_server = require('https').createServer(credentials,app);


var eurecaServer = new EurecaServer({
  allow: [ // Network client methods
    'setId', 'spawnPlayer', 'kill', 'updateCursor',
    'positionTile', 'dropTile', 'dragTiles', 'flipTile', 'toHand', 'fromHand', 'lock', 'unlock', 'ownedBy', 'releasedBy',
    'updateStackCards', 'flipStack',
    'spin',
    'receiveChat', 'arrangeLayer'
  ]
});

log('attach eurecaServer', eurecaServer.version);
// attach eureca.io to our http server
eurecaServer.attach(https_server);



// Connect to mongodb
var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  mongoose.connect(config.db, options);
};
connect();

mongoose.connection.on('error', log);
mongoose.connection.on('disconnected', connect);

// Bootstrap models
fs.readdirSync(__dirname + '/app/models').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/app/models/' + file);
});

// Bootstrap passport config
require('./config/passport')(passport, config);

// Bootstrap application settings
require('./config/express')(app, passport, eurecaServer);

// Bootstrap routes
require('./config/routes')(app, passport);

// Eureca Server config
require('eurecaserver')(eurecaServer);

https_server.listen(https_port);
log('Express https app started on port ' + https_port);


// Secondary http app - redirect to https
var httpApp = express();
var httpRouter = express.Router();
console.log( https_server.address() )
httpRouter.get('/', function(req, res){
    var host = req.get('Host');
    // replace the port in the host
    //host = host.replace(/:\d+$/, ":"+app.get('port'));
    // determine the redirect destination
    var destination =  ['https://', host, req.url].join('');
    console.log('redirect http to ',destination );
    return res.redirect(destination);
});
httpApp.use('*', httpRouter);
var httpServer =  require('http').createServer(httpApp);
httpServer.listen(port);





// const peerServer = ExpressPeerServer(https_server, {
//   port: 9000,
//   path: '/peerjs',
//   key:"8z62zmz8keasjor",
//   allow_discovery: true,
//   ssl:{ key: privateKey, cert: certificate}
// });

//  Run a peer server separately:   cd node_modules/peer/bin && ./peerjs --port 9000 --key 8z62zmz8keasjor --sslkey /etc/letsencrypt/live/localhost/privkey.pem --sslcert /etc/letsencrypt/live/localhost/cert.pem --allow_discovery







/**
 * Expose
 */

module.exports = app;
