var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var Path = require('path');
var run;

var header =
"var servi = require('" + __dirname + "/node_modules/servi/lib/servi.js');" +
"var app = new servi(true);" +
"\n\n\n";

var footer = "\n\n\n" +
"if (typeof run === 'function') app.defaultRoute(run);" +
"start();";

function start(app, code, path, editorWin){
  try {
    run.kill();
  } catch(e) {

  }

  if (path === null) {
    path = gui.App.dataPath + "/.tmpscript";
  }

  var tmpFile = Path.join(Path.dirname(path), ".tmpscript");

  code = header + code + footer;

  fs.writeFile(tmpFile, code, function (err,data) {
    if (err) {
      return console.log(err);
    }

    run = spawn('bin/node', [tmpFile]);

    run.stderr.on('data', function (data) {
      log(data);
    });

    run.stdout.on('data', function (data) {
      var serverOut = '' + data;
      log(serverOut);
      if (serverOut.indexOf('Server has started') > -1 ) {
        //console.log(serverOut);
        var serverLines = serverOut.split('\n');
        for (var i = 0; i < serverLines.length; i++) {
          if (serverLines[i].indexOf('Server has started') > -1) {
            var serverParams = serverLines[i].split(' ');
            var port = serverParams[serverParams.length - 1];
            editorWin.openOutputWindow(port);
          }

        }
      }
    });
  });


  //run = exec('node ' + path, function (error, stdout, stderr) {
    //console.log('stdout: ' + stdout);
    //console.log('stderr: ' + stderr);
    //if (error !== null) {
      //console.log('exec error: ' + error);
    //}
  //});

}

exports.start = start;

