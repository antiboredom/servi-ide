var fs = require("fs");
var Path = require("path");
var gui = require('nw.gui');
var find = require('findit');
var runner = require('./runner.js');

var currentFile;
var ace = window.ace;
var win = gui.Window.get();
var outputWin;

win.show();
win.focus();

//set up editor
var editor = ace.edit("editor");
var editorSession = editor.getSession();

editorSession.setMode("ace/mode/javascript");
editor.setShowPrintMargin(false);
editor.focus();

var path = window.PATH || gui.App.argv[0] || localStorage.lastFile || "";

if (path) loadFile(path);


editor.commands.addCommand({
    name: 'Run',
    bindKey: {mac: "Command-R", win: "Ctrl-R"},
    exec: function(editor) {
      runCode(path);
    }
});

editor.commands.addCommand({
    name: 'Open',
    bindKey: {mac: "Command-O", win: "Ctrl-O"},
    exec: function(editor) {
      //$("#openFile").trigger("click");
      openFile();
    }
});

editor.commands.addCommand({
    name: 'Save',
    bindKey: {mac: "Command-S", win: "Ctrl-S"},
    exec: function(editor) {
      saveFile();
    }
});

editor.commands.addCommand({
    name: 'Save As',
    bindKey: {mac: "Command-Shift-S", win: "Ctrl-Shift-S"},
    exec: function(editor) {
      saveFileAs();
    }
});

editor.commands.addCommand({
    name: 'New',
    bindKey: {mac: "Command-N", win: "Ctrl-N"},
    exec: function(editor) {
      newFile();
    }
});

editor.commands.addCommand({
    name: 'Close',
    bindKey: {mac: "Command-W", win: "Ctrl-W"},
    exec: function(editor) {
      closeFile();
    }
});

editor.commands.addCommand({
  name: "devtool",
  bindKey: {win: "Alt-Ctrl-J", mac: "Alt-Command-J"},
  exec: function() {
    gui.Window.get().showDevTools();
  }
});

var port = 3000;
function runCode(path){
  gui.App.clearCache();
  var data = editor.getSession().getValue();
  runner.start(gui.App, data, path);
  //gui.Shell.openExternal('http://localhost:' + port);
  if (outputWin == null) {
    outputWin = gui.Window.open("http://localhost:" + port, {
      x: win.x + 100,
      y: win.y + 100,
      focus: true,
      toolbar: true
    });
    //var loaded = false;
    //outputWin.on("loaded", function(){
      //if (loaded !== false) {
        //loaded = true;
        //outputWin.reloadIgnoringCache();
      //}
    //});
    outputWin.on("close", function(){
      this.close(true);
      outputWin = null;
    });
  } else {
    outputWin.window.location = "http://localhost:" + port;
    //outputWin.reloadIgnoringCache()
    outputWin.focus();
  }
}

global.updateOutputWindow = function(p) {
  port = p;
  if (outputWin != null) {
    outputWin.window.location = "http://localhost:" + port;
    outputWin.reloadIgnoringCache()
    outputWin.focus();
  }
}

function openFile() {
  var chooser = $("#openFile");
  chooser.trigger('click');
  chooser.change(function(evt) {
    openWindow(this.files[0].path);
  });
}

function saveFile() {
  if (!path) {
    openSaveDialog();
  } else {
    writeFile();
  }
}

function saveFileAs() {
  openSaveDialog();
}

function openSaveDialog() {
  var chooser = $('#saveFile');
  chooser.trigger('click');
  chooser.change(function(evt) {
    if ($(this).val()) {
      var saveFilename = $(this).val();
      currentFile = saveFilename;
      path = saveFilename;
      writeFile();
    }
  });
}

function writeFile() {
  fs.writeFile(path, editor.getValue(), "utf8", function(err) {
    handleFileChange();
    //add error handling
  });
}

function openWindow(path) {
  var win = window.open(location.href);
  win.PATH = path;
}

function loadFile() {
  editor.setReadOnly(true);
  fs.readFile(path, "utf8", function(err, file) {
    editor.setReadOnly(false);
    editor.setValue(file, -1);
    handleFileChange();
  });
}

function handleFileChange() {
  var p = path.split("/");
  currentFile = p[p.length-2] + "/" + p[p.length-1];
  gui.Window.get().title = currentFile;

  var mode = detectType(path, file);
  editor.getSession().setMode("ace/mode/" + mode);

  localStorage.lastFile = path;
}

function closeFile() {
  win.close();
}

function newFile() {
  localStorage.lastFile = null;
  window.open(location.href);
}

var modes = {
  ".html": "html",
  ".htm": "html",
  ".js": "javascript",
  ".css": "css",
  ".json": "json",
  ".txt": "text",
};

function detectType(path, contents) {
  var ext = Path.extname(path);
  return modes[ext] || "text";
}

//var $sidebar = $('#sidebar');

//function getFileTree() {
  //$sidebar.html('');

  //var finder = find(Path.dirname(path));
  //var files = [];
  //{"index1.js": {
      //type: "file"}};

  //{"./": 
    //{files: ["file1", "file2", "/public":
  //finder.on('directory', function (dir, stat, stop) {
    //var base = Path.basename(dir);
    //if (base[0] === '.' || base === 'node_modules') stop();
    //files.push({
    //else console.log(dir + '/');
  //});

  //finder.on('file', function (file, stat) {
    //var base = Path.basename(file);
    //if (base[0] === '.') stop();
    //else console.log(file);
  //});
//}

var debugConsole = $('#debug');

global.log = function(msg) {
  debugConsole.append('<pre>' + msg + '</pre>');
  debugConsole.scrollTop(debugConsole[0].scrollHeight);
}

$('#drag').on('mousedown', function(e){
  var $dragable = $(this).parent(),
  handleHeight = $(this).height(),
  startHeight = $dragable.height(),
  pY = e.pageY;

  $(document).on('mouseup', function(e){
    $(document).off('mouseup').off('mousemove');
  });

  $(document).on('mousemove', function(me){
    var my = (me.pageY - pY);
    if (startHeight - my >= handleHeight) {
      $dragable.css({ height: startHeight - my });
      editor.resize();
    }
  });
});


//menus
var menubar = new gui.Menu({ type: 'menubar' });
var file = new gui.Menu();

file.append(new gui.MenuItem({ label: 'New \t\t\u2318N', click: function(){
  newFile();
}}));

file.append(new gui.MenuItem({ label: 'Open \t\t\u2318O', click: function(){
  openFile();
}}));

file.append(new gui.MenuItem({ label: 'Close \t\t\u2318W', click: function(){
  closeFile();
}}));

file.append(new gui.MenuItem({ label: 'Save \t\t\u2318S', click: function(){
  saveFile();
}}));

file.append(new gui.MenuItem({ label: 'Save As \t\t\u21E7\u2318S', click: function(){
  saveFileAs();
}}));

file.append(new gui.MenuItem({ type: 'separator' }));

file.append(new gui.MenuItem({ label: 'Run \t\t\u2318R', click: function(){
  runCode(path);
}}));

var help = new gui.Menu();
win.menu = menubar;
win.menu.insert(new gui.MenuItem({ label: 'File', submenu: file}), 1);
win.menu.append(new gui.MenuItem({ label: 'Help', submenu: help}));

