var gui = require('nw.gui');
var Path = require('path');
var util = require('util');
var runner = require('./runner.js');

var modes = {
  ".html": "ejs",
  ".htm": "ejs",
  ".js": "javascript",
  ".css": "css",
  ".json": "json",
  ".txt": "text"
};

function Editor(projectPath) {
  this.openedFiles = {};
  this.fileBuffer = {};
  this.projectPath = projectPath;

  this.window = gui.Window.get();
  this.ace = window.ace;
  this.editor = ace.edit("editor");
  this.editorSession = this.editor.getSession();
  this.editorSession.setMode("ace/mode/javascript");
  this.editor.setShowPrintMargin(false);
  this.editor.focus();

  this.previousFile = null;

  var self = this;

  this.editor.on('change', function() {
    self.fileBuffer[self.filePath] = self.editor.getValue();
    if (self.openedFiles[self.filePath] != self.fileBuffer[self.filePath]) {
      self.window.title = (self.currentFile || 'Untitled') + ' *';
    } else {
      self.window.title = self.currentFile || 'Untitled';
    }
  });

  this.outputWin = null;
  this.filePath = null;

  this.openProject();
  this.setShortCuts();
}

Editor.prototype.openProject = function() {
  this.fileTree = new FileTree(this.projectPath, this);
  if (this.projectPath !== null) {
    for (var i = 0; i < this.fileTree.files.length; i++) {
      var f = this.fileTree.files[i];
      if (f.label == 'sketch.js') {
        this.openFile(f.path);
        this.fileTree.selectNodeByPath(f.path);
      }
    }
  }
};

Editor.prototype.openFile = function(path) {
  var self = this;

  self.previousFile = self.filePath;
  self.filePath = path;
  self.editor.setReadOnly(true);

  if (self.fileBuffer[path]) {
    self.editor.setReadOnly(false);
    self.editor.setValue(self.fileBuffer[path], -1);
    self.handleFileChange();
  } else {
    fs.readFile(path, "utf8", function(err, file) {
      self.editor.setReadOnly(false);
      self.editor.setValue(file, -1);
      self.openedFiles[path] = file;
      self.fileBuffer[path] = file;
      self.handleFileChange();
    });
  }
};

Editor.prototype.handleFileChange = function() {
  this.getCurrentFilename();
  this.setTitle();
  this.mode = this.detectType(this.filePath);
  this.editor.getSession().setMode("ace/mode/" + this.mode);
  this.editor.focus();
  //if (!this.projectPath) {
    //this.fileTree.
};

Editor.prototype.getCurrentFilename = function() {
  var p = this.filePath.split("/");
  this.currentFile = p[p.length-2] + "/" + p[p.length-1];
  return this.currentFile;
};

Editor.prototype.setTitle = function() {
  this.window.title = this.currentFile;
  if (this.openedFiles[this.filePath] != this.fileBuffer[this.filePath]) {
    this.window.title = this.currentFile + ' *';
  } else {
    this.window.title = this.currentFile;
  }
};

Editor.prototype.writeFile = function() {
  var self = this;
  fs.writeFile(this.filePath, this.editor.getValue(), "utf8", function(err) {
    self.handleFileChange();
    //add error handling
  });
}


Editor.prototype.detectType = function(path) {
  var ext = Path.extname(path);
  return modes[ext] || "text";
}

Editor.prototype.saveFile = function() {
  if (this.filePath === null) {
    this.openSaveDialog();
  } else {
    this.writeFile();
    this.openedFiles[this.filePath] = this.fileBuffer[this.filePath];
  }
};

Editor.prototype.saveFileAs = function() {
  this.openSaveDialog();
};

Editor.prototype.openSaveDialog = function() {
  saver.trigger('click');
};

Editor.prototype.newFile = function() {
};

Editor.prototype.newWindow = function() {
  var win = gui.Window.open('index.html', {
    position: 'center',
    width: 800,
    height: 800,
    toolbar: false,
    focus: true
  });
};

Editor.prototype.openProjectFolder = function() {
  opener.trigger('click');
};

Editor.prototype.close = function() {

};

Editor.prototype.run = function() {
  gui.App.clearCache();
  var data = this.editor.getSession().getValue();
  runner.start(gui.App, data, path, this);
};

Editor.prototype.openOutputWindow = function(port) {
  var self = this;
  if (this.outputWin == null) {
    this.outputWin = gui.Window.open("http://localhost:" + port, {
      x: this.window.x + 100,
      y: this.window.y + 100,
      focus: true,
      toolbar: true
    });
    this.outputWin.on("close", function(){
      this.close(true);
      self.outputWin = null;
    });
  } else {
    this.outputWin.window.location = "http://localhost:" + port;
    this.outputWin.focus();
  }
}

Editor.prototype.setShortCuts = function() {
  var self = this;
  self.editor.commands.addCommand({
      name: 'Run',
      bindKey: {mac: "Command-R", win: "Ctrl-R"},
      exec: function(editor) {
        self.run();
      }
  });

  self.editor.commands.addCommand({
      name: 'Open',
      bindKey: {mac: "Command-O", win: "Ctrl-O"},
      exec: function(editor) {
        self.openProjectFolder();
      }
  });

  self.editor.commands.addCommand({
      name: 'Save',
      bindKey: {mac: "Command-S", win: "Ctrl-S"},
      exec: function(editor) {
        self.saveFile();
      }
  });

  self.editor.commands.addCommand({
      name: 'Save As',
      bindKey: {mac: "Command-Shift-S", win: "Ctrl-Shift-S"},
      exec: function(editor) {
        self.saveFileAs();
      }
  });

  self.editor.commands.addCommand({
      name: 'New',
      bindKey: {mac: "Command-N", win: "Ctrl-N"},
      exec: function(editor) {
        self.newFile();
      }
  });

  self.editor.commands.addCommand({
      name: 'New Project',
      bindKey: {mac: "Command-Shift-N", win: "Ctrl-Shift-N"},
      exec: function(editor) {
        self.newWindow();
      }
  });

  self.editor.commands.addCommand({
      name: 'Close',
      bindKey: {mac: "Command-W", win: "Ctrl-W"},
      exec: function(editor) {
        self.close();
      }
  });

  self.editor.commands.addCommand({
    name: "devtool",
    bindKey: {win: "Alt-Ctrl-J", mac: "Alt-Command-J"},
    exec: function() {
      self.window.showDevTools();
    }
  });

  //self.window.on("devtools-opened", function(url) {
    //console.log("devtools-opened: " + url);
    //$('#debug-frame')[0].src = url;
  //});

  var menubar = new gui.Menu({ type: 'menubar' });
  var fileMenu = new gui.Menu();

  fileMenu.append(new gui.MenuItem({ label: 'New \t\t\u2318N', click: function(){
    self.newFile();
  }}));

  fileMenu.append(new gui.MenuItem({ label: 'Open \t\t\u2318O', click: function(){
    self.openFile();
  }}));

  fileMenu.append(new gui.MenuItem({ label: 'Close \t\t\u2318W', click: function(){
    self.closeFile();
  }}));

  fileMenu.append(new gui.MenuItem({ label: 'Save \t\t\u2318S', click: function(){
    self.saveFile();
  }}));

  fileMenu.append(new gui.MenuItem({ label: 'Save As \t\t\u21E7\u2318S', click: function(){
    self.saveFileAs();
  }}));

  fileMenu.append(new gui.MenuItem({ type: 'separator' }));

  fileMenu.append(new gui.MenuItem({ label: 'Save & Run \t\u2318R', click: function(){
    self.run();
  }}));

  var help = new gui.Menu();
  this.window.menu = menubar;
  this.window.menu.insert(new gui.MenuItem({ label: 'File', submenu: fileMenu}), 1);
  this.window.menu.append(new gui.MenuItem({ label: 'Help', submenu: help}));

}

function makeDraggable(el, vertical) {
  $(el).on('mousedown', function(e){
    var $dragable = $(this).parent(),
    handleDim = vertical ? $(this).height() : $(this).width(),
    startDim = vertical ? $dragable.height() : $dragable.width(),
    pY = vertical ? e.pageY : e.pageX;

    $(document).on('mouseup', function(e){
      $(document).off('mouseup').off('mousemove');
    });

    $(document).on('mousemove', function(me){
      var my = vertical ? (me.pageY - pY) : (pY - me.pageX);
      if (startDim - my >= handleDim) {
        if (vertical) $dragable.css({ height: startDim - my });
        else $dragable.css({ width: startDim - my });
        editor.editor.resize();
      }
    });
  });
}

makeDraggable('#debug-drag', true);
makeDraggable('#sidebar-drag', false);

$('#run').click(function(){
  editor.run();
});

var debugConsole = $('#debug');
global.log = function(msg) {
  debugConsole.append('<pre>' + msg + '</pre>');
  debugConsole.scrollTop(debugConsole[0].scrollHeight);
}

var path = window.location.search.substring(1).split('=')[1] || null;
var me = window.location.href.split('?')[0];
//var path = var path = window.PATH || gui.App.argv[0] || null
var editor = new Editor(path);
var opener = $("#openFile");
opener.change(function(evt) {
  var win = gui.Window.open(me + '?path=' + this.files[0].path, {
    position: 'center',
    width: 800,
    height: 800,
    toolbar: false,
    focus: true,
    show: false
  });
});

var saver = $('#saveFile');
saver.change(function(evt) {
  if ($(this).val()) {
    var saveFilename = $(this).val();
    editor.filePath = saveFilename;
    editor.writeFile();
  }
});
onload = function() {
  gui.Window.get().show();
}
