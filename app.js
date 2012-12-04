/**
 * Module dependencies.
 */

var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , sio = require('socket.io')
  , azure = require('azure')
  , uuid = require('node-uuid')
  , async = require('async')
  , conf = require('nconf');

//nconf.env().file({file: 'settings.json'});

/**
 * App.
 */

var app = express.createServer();

/**
 * App configuration.
 */

app.configure(function () {
  app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  function compile (str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib());
  };
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
  res.render('index', { layout: false });
});

/**
 * App listen.
 */

var sbnamespace = process.env.SERVICEBUS_NAMESPACE;
var sbkey = process.env.SERVICEBUS_ACCESS_KEY;
console.log("SB Namespace:" + sbnamespace);
console.log("SB Access Key:" + sbkey);

var serviceBusClient = azure.createServiceBusService(sbnamespace, sbkey);
var serviceBusSubscription = uuid.v4();

/**
 * Socket.IO server (single process only)
 */

var io = sio.listen(app)
  , nicknames = {};

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 50); 
  serviceBusCreateTopics();
});

function setUpSocketIo(){
  io.sockets.on('connection', function (socket) {
    socket.on('usermessage', function (msg) {
      serviceBusSend([socket.nickname, msg], 'usermessage');
    });

    socket.on('nickname', function (nick, fn) {
      if (nicknames[nick]) {
        fn(true);
      } else {
        fn(false);
        nicknames[nick] = socket.nickname = nick;
        serviceBusSend(nick + ' connected', 'announcement');
        serviceBusSend(nicknames, 'nicknames');
      }
    });

    socket.on('disconnect', function () {
      if (!socket.nickname) return;
      delete nicknames[socket.nickname];
      serviceBusSend(socket.nickname + 'disconnected', 'announcement');
      serviceBusSend(nicknames, 'nicknames');
    });
  });
  listen();
}

function listen() {
  app.listen(process.env.PORT || 3000, function () {
    var addr = app.address();
    console.log('\nApp listening on http://' + addr.address + ':' + addr.port + "\n");
    receiveMessages();
  });
}

function receiveMessages() {
  console.log('Receiving messages');
  serviceBusReceive('usermessage');
  serviceBusReceive('announcement');
  serviceBusReceive('nicknames');
}


function serviceBusCreateTopics() {
  console.log('About to create Service Bus topics');
  async.series([
    function(callback) {
      serviceBusClient.createTopicIfNotExists('announcement', callback)
    },
    function(callback) {
      serviceBusClient.createTopicIfNotExists('usermessage', callback)
    },
    function(callback) {
      serviceBusClient.createTopicIfNotExists('nicknames', serviceBusCreateSubscriptions)
    },
  ]);
}

function serviceBusCreateSubscriptions()
{
  console.log('About to create Service Bus subscriptions');
  async.series([
      function(callback) {
        serviceBusClient.createSubscription('announcement', serviceBusSubscription, callback);
      },
      function(callback) {
        serviceBusClient.createSubscription('usermessage', serviceBusSubscription, callback);
      },
      function() {
        serviceBusClient.createSubscription('nicknames', serviceBusSubscription, setUpSocketIo);
      }
    ]);
}

function serviceBusSend(message, topic){
  var msg = JSON.stringify(message);
  console.log('About to queue message to ServiceBus: ' + msg);
  serviceBusClient.sendTopicMessage(topic, 
    msg, 
    function messageSent(error) {
      if (error) {
        console.log(error);
        throw error;
      } else {
        console.log('Message queued up to Service Bus: ' + msg);
      }
    });
}

function serviceBusReceive(topic){
  console.log('About to receive message for topic: ' + topic);
  serviceBusClient.receiveSubscriptionMessage(topic,
    serviceBusSubscription, {timeoutIntervalInS: 5}, 
    function messageReceived(error, message) {
      if (error) {
        if(error === 'No messages to receive'){
          console.log('No messages for topic: ' + topic + ', retrying');
          serviceBusReceive(topic);
        } else {
          console.log(error);
          throw error;
        }
      } else {
        console.log('Received Service Bus message ' + 
          JSON.stringify(message));
        
        var body = JSON.parse(message.body);
        if (body instanceof Array) {
          io.sockets.emit(topic, body[0], body[1]);
        }
        else {
          io.sockets.emit(topic, body);
        }
        serviceBusReceive(topic);
      }
    });
}
