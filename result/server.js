var express = require('express'),
    async = require('async'),
    { Pool } = require('pg'),
    cookieParser = require('cookie-parser'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server);

var port = process.env.PORT || 4000;

io.on('connection', function (socket) {

  socket.emit('message', { text : 'Welcome!' });

  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});

var pool = new Pool({
  connectionString: 'postgres://postgres:postgres@db/postgres'
});

async.retry(
  {times: 1000, interval: 1000},
  function(callback) {
    pool.connect(function(err, client, done) {
      if (err) {
        console.error("Waiting for db");
      }
      callback(err, client);
    });
  },
  function(err, client) {
    if (err) {
      return console.error("Giving up");
    }
    console.log("Connected to db");
    getVotes(client);
  }
);

function getVotes(client) {
  client.query('SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote', [], function(err, result) {
    if (err) {
      console.error("Error performing query: " + err);
    } else {
      var votes = collectVotesFromResult(result);
      io.sockets.emit("scores", JSON.stringify(votes));
    }

    setTimeout(function() {getVotes(client) }, 1000);
  });
}

function collectVotesFromResult(result) {
  var votes = {a: 0, b: 0};

  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.count);
  });

  return votes;
}

// Fork pédagogique : libellés des deux options configurables (OPTION_A / OPTION_B), comme pour vote.
var fs = require('fs');
var path = require('path');
var optionA = process.env.OPTION_A || 'Cats';
var optionB = process.env.OPTION_B || 'Dogs';
function escapeHtml(text) {
  return String(text).replace(/[&<>"'{}]/g, function (c) {
    return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '{': '&#123;', '}': '&#125;'}[c];
  });
}
var indexHtml = fs.readFileSync(path.resolve(__dirname + '/views/index.html'), 'utf8')
  .replace('<title>Cats vs Dogs -- Result</title>', '<title>' + escapeHtml(optionA) + ' / ' + escapeHtml(optionB) + ' -- Résultats</title>')
  .replace('<div class="label">Cats</div>', '<div class="label">' + escapeHtml(optionA) + '</div>')
  .replace('<div class="label">Dogs</div>', '<div class="label">' + escapeHtml(optionB) + '</div>');

app.use(cookieParser());
app.use(express.urlencoded());

app.get(['/', '/index.html'], function (req, res) {
  res.type('html').send(indexHtml);
});

app.use(express.static(__dirname + '/views', { index: false }));

server.listen(port, function () {
  var port = server.address().port;
  console.log('App running on port ' + port);
});
