var gui = require('nw.gui');
var Path = require('path');
var util = require('util');
var os = require('os');
var wrench = require('wrench');
var runner = require('./runner.js');

global.appDataPath = gui.App.dataPath;

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
  this.temporaryFiles = [];
  this.mainFile = null;

  this.window = gui.Window.get();
  this.ace = window.ace;
  this.editor = ace.edit("editor");
  this.editor.setTheme("ace/theme/tomorrow");
  //this.editor.setTheme("ace/themes/clouds");
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
}

Editor.prototype.openProject = function() {
  if (this.projectPath === null) {
    this.createEmptyProject();
  }

  this.fileTree = new FileTree(this.projectPath, this);
};

Editor.prototype.openFile = function(path) {
  var self = this;

  self.previousFile = self.filePath;
  self.filePath = path;
  self.editor.setReadOnly(true);

  fs.readFile(path, "utf8", function(err, file) {
    if (self.fileBuffer[path] && file !== self.openedFiles[path]) {
      if (confirm('The file has been changed by another program. Do you want to reload it?')) {
        self.fileBuffer[path] = file;
        self.openedFiles[path] = file;
      }
    } else {
      self.openedFiles[path] = file;
      self.fileBuffer[path] = file;
    }
    self.editor.setReadOnly(false);
    self.editor.session.setValue(self.fileBuffer[path], -1);
    self.handleFileChange();
  });

};

Editor.prototype.handleFileChange = function() {
  this.getCurrentFilename();
  this.setTitle();
  this.mode = this.detectType(this.filePath);
  this.editor.getSession().setMode("ace/mode/" + this.mode);
  this.editor.focus();
  this.editorSession.$undoManager.reset();
  //this.editor.editorSession.$undoManager.reset();
};

Editor.prototype.getCurrentFilename = function() {
  var p = this.filePath.split("/");
  //this.currentFile = p[p.length-2] + "/" + p[p.length-1];
  this.currentFile = p[p.length-1];
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
    if (self.projectPath === null) {
      self.projectPath = self.filePath;
      self.fileTree.path = Path.dirname(self.projectPath);
      self.fileTree.filepath = self.projectPath;
      self.fileTree.reloadTree();
    }
    self.handleFileChange();
    //add error handling
  });
}


Editor.prototype.detectType = function(path) {
  var ext = Path.extname(path);
  this.ext = ext;
  return modes[ext] || "text";
}

Editor.prototype.saveFile = function() {
  if (this.filePath === null || this.temporaryFiles.indexOf(this.filePath) > -1) {
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
  var self = this;
  var tmpfolder = Path.join(os.tmpdir(), 'servi' + Date.now());
  var filepath = Path.join(tmpfolder, 'Untitled ' + (this.temporaryFiles.length + 1));
  fs.mkdir(tmpfolder, function() {
    fs.writeFile(filepath, '', 'utf8', function(err){
      self.fileTree.addTempFile(filepath);
      self.temporaryFiles.push(filepath);
      self.openFile(filepath);
    });
  });
};

Editor.prototype.createEmptyProject = function() {
  this.newFile();
}

Editor.prototype.removeTempFile = function() {
  var index = this.temporaryFiles.indexOf(this.filePath);
  if (index > -1) {
    this.temporaryFiles.splice(index, 1);
    delete this.openedFiles[this.filePath];
    delete this.fileBuffer[this.filePath];
  }
  var index = this.fileTree.temporaryFiles.indexOf(this.filePath);
  if (index > -1) {
    this.fileTree.temporaryFiles.splice(index, 1);
  }
}

Editor.prototype.newWindow = function() {
  var win = gui.Window.open(editorWindowURL, {
    x: this.window.x + 50,
    y: this.window.y + 50,
    //position: 'center',
    width: 1200,
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
  var ext = Path.extname(this.filePath);
  if (!this.mainFile && ext === '.js') this.mainFile = this.filePath;
  if (!this.mainFile) return false;
  gui.App.clearCache();
  var self = this;
  fs.readFile(this.mainFile, function(err, data){
    if (err) throw err;
    runner.start(gui.App, data, path, self);
  });
  //var data = this.editor.getSession().getValue();
};

Editor.prototype.setMainFile = function(path) {
  this.mainFile = path;
};

Editor.prototype.openOutputWindow = function(port) {
  var self = this;
  if (this.outputWin === null) {
    this.outputWin = gui.Window.open("http://localhost:" + port, {
      x: this.window.x + 50,
      y: this.window.y + 50,
      focus: true,
      toolbar: true
    });
    this.outputWin.on("close", function(){
      //console.log('killing from window ', nodeProcess.pid);
      //nodeProcess.kill();
      runner.killChild();
      this.close(true);
      self.outputWin = null;
    });
  } else {
    try {
      this.outputWin.window.location = "http://localhost:" + port;
      this.outputWin.focus();
    } catch(e) {
      this.outputWin = null;
      this.openOutputWindow(port, nodeProcess);
      //console.log(util.inspect(e));
    }
  }
}

Editor.prototype.export = function() {
  var self = this;
  if (self.fileTree.path === null) return false;
  if (!self.mainFile && self.ext === '.js') self.mainFile = self.filePath;
  if (!self.mainFile) return false;
  fs.readFile(self.mainFile, function(err, filecontents){
    if (err) throw err;
    self.fileTree.pauseWatch();
    var servi_ide_dir = Path.dirname(self.window.window.location.pathname);
    var projectdir = self.fileTree.path;
    var exportdir = Path.join(projectdir, 'export');
    wrench.copyDirSyncRecursive(projectdir, exportdir, {
      forceDelete: true,
      excludeHiddenUnix: true,
      inflateSymlinks: false,
      exclude: 'export'
    });
    var node_modules_dir = Path.join(exportdir, 'node_modules');
    fs.mkdirSync(node_modules_dir);
    wrench.copyDirSyncRecursive(Path.join(servi_ide_dir, 'node_modules', 'servi'), Path.join(node_modules_dir, 'servi'));
    var compiled_filename = Path.join(exportdir, Path.relative(projectdir, self.mainFile))
    var data = runner.compile(filecontents, false);
    fs.writeFileSync(compiled_filename, data);
    gui.Shell.showItemInFolder(exportdir);
    self.fileTree.watch();
  });
}

Editor.prototype.changeFontSize = function(val) {
  var $e = $('#editor');
  var fontSize = parseInt($e.css('font-size'));
  $e.css('font-size', fontSize + val);
}

function makeDraggable(el, vertical, reverse) {
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
        else $dragable.css({ width: startDim + (reverse ? my : my * -1) });
        editor.editor.resize();
      }
    });
  });
}

makeDraggable('#debug-drag', false, true);
makeDraggable('#sidebar-drag', false);

$('#run').click(function(){
  editor.run();
});

$('#export').click(function(){
  editor.export();
});

$('#add').click(function(){
  editor.newFile();
});

$('#settings').click(function(){
  alert('note to self: make this do something');
});

var debugConsole = $('#debug');
global.log = function(msg) {
  debugConsole.append('<pre>' + msg + '</pre>');
  debugConsole.scrollTop(debugConsole[0].scrollHeight);
}

var path = window.location.search.substring(1).split('=')[1] || null;
var editorWindowURL = window.location.href.split('?')[0];
//var path = var path = window.PATH || gui.App.argv[0] || null

var editor = new Editor(path);

var opener = $("#openFile");
opener.change(function(evt) {
  var win = gui.Window.open(editorWindowURL + '?path=' + this.files[0].path, {
    x: editor.window.x + 50,
    y: editor.window.y + 50,
    //position: 'center',
    width: 1200,
    height: 800,
    toolbar: false,
    focus: true,
    show: false
  });
  opener.val('');
});

var saver = $('#saveFile');
saver.change(function(evt) {
  if ($(this).val()) {
    var saveFilename = $(this).val();
    editor.removeTempFile();
    editor.filePath = saveFilename;
    editor.writeFile();
  }
  saver.val('');
});

onload = function() {
  gui.Window.get().show();
  editor.editor.focus();
}

editor.window.on("close", function(){
  var unsavedFiles = {};
  var totalUnsaved = 0;
  for(var p in editor.openedFiles) {
    if(editor.openedFiles.hasOwnProperty(p)) {
      if (editor.openedFiles[p] != editor.fileBuffer[p]) {
        totalUnsaved ++;
        unsavedFiles[p] = editor.fileBuffer[p];
      }
    }
  }
  if (totalUnsaved > 0) {
    if (confirm('You have unsaved files. Are you sure you want to exit?')) {
      //for(var p in unsavedFiles) {
        //if(unsavedFiles.hasOwnProperty(p)) {
          //fs.writeFileSync(p, unsavedFiles[p], "utf8");
        //}
      //}
      this.close(true);
      editor.window = null;
    }
  } else {
    this.close(true);
    editor.window = null;
  }
});

