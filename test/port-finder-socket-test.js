/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    net = require('net'),
    path = require('path'),
    async = require('async'),
    vows = require('vows'),
    portfinder = require('../lib/portfinder'),
    fs = require('fs'),
    glob = require('glob');

var servers = [],
    socketDir = path.join(__dirname, 'fixtures'),
    badDir = path.join(__dirname, 'bad-dir');

function createServers (callback) {
  var base = 0;

  async.whilst(
    function () { return base < 5 },
    function (next) {
      var server = net.createServer(function () { }),
          name = base === 0 ? 'test.sock' : 'test' + base + '.sock';

      server.listen(path.join(socketDir, name), next);
      server.on('error', function(err) {
        console.log("err is %o", err);
        server.close();
      });

      base++;
      servers.push(server);
    }, callback);
}

function cleanup(callback) {
  glob(path.join(socketDir, '*'), function (err, files) {
    if (err) { callback(err); }

    for (var i = 0; i < files.length; i++) { fs.unlinkSync(files[i]); }

    fs.rmdirSync(badDir);
    callback(null, true);
  });
}

vows.describe('portfinder').addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        createServers(function() {
          portfinder.getSocket({
            path: path.join(badDir, 'test.sock')
          }, this.callback);
        }.bind(this));
      },
      "the getPort() method": {
        topic: function () {
          portfinder.getSocket({
            path: path.join(socketDir, 'test.sock')
          }, this.callback);
        },
        "should respond with the first free socket (test5.sock)": function (err, socket) {
          assert.isTrue(!err);
          assert.equal(socket, path.join(socketDir, 'test5.sock'));
        }
      }
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with no existing servers": {
      "the getSocket() method": {
        "with a directory that doesnt exist": {
          topic: function () {
            fs.rmdirSync(badDir);
            portfinder.getSocket({
              path: path.join(badDir, 'test.sock')
            }, this.callback);
          },
          "should respond with the first free socket (test.sock)": function (err, socket) {
            assert.isTrue(!err);
            assert.equal(socket, path.join(badDir, 'test.sock'));
          }
        },
        "with a directory that exists": {
          topic: function () {
            portfinder.getSocket({
              path: path.join(socketDir, 'exists.sock')
            }, this.callback);
          },
          "should respond with the first free socket (exists.sock)": function (err, socket) {
            assert.isTrue(!err);
            assert.equal(socket, path.join(socketDir, 'exists.sock'));
          }
        }
      }
    }
  }
}).addBatch({
  "When the tests are over": {
    topic: function() {
      cleanup(this.callback);
    },
    "necessary cleanup should have taken place": function (err, wasRun) {
      assert.isTrue(!err);
      assert.isTrue(wasRun);
    }
  }
}).export(module);
