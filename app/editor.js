var gui = require('nw.gui');
var Path = require('path');
var util = require('util');
var os = require('os');
var wrench = require('wrench');
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
  this.temporaryFiles = [];

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
  }
  var index = this.fileTree.temporaryFiles.indexOf(this.filePath);
  if (index > -1) {
    this.fileTree.temporaryFiles.splice(index, 1);
  }
}

Editor.prototype.newWindow = function() {
  var win = gui.Window.open(editorWindowURL, {
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

Editor.prototype.export = function() {
  if (this.fileTree.path === null) return false;
  var servi_ide_dir = Path.dirname(this.window.window.location.pathname);
  var projectdir = this.fileTree.path;
  var exportdir = Path.join(projectdir, 'export');
  if (this.ext === '.js') {
    wrench.rmdirSyncRecursive(exportdir);
    wrench.copyDirSyncRecursive(projectdir, exportdir, {
      forceDelete: true,
      excludeHiddenUnix: true,
      inflateSymlinks: false,
      exclude: 'export'
    });
    var node_modules_dir = Path.join(exportdir, 'node_modules');
    fs.mkdirSync(node_modules_dir);
    wrench.copyDirSyncRecursive(Path.join(servi_ide_dir, 'node_modules', 'servi'), Path.join(node_modules_dir, 'servi'));
    var data = runner.compile(this.editor.getSession().getValue(), false);
    var compiled_filename = Path.join(exportdir, Path.relative(projectdir, this.filePath))
    fs.writeFileSync(compiled_filename, data);
  }
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
var editorWindowURL = window.location.href.split('?')[0];
//var path = var path = window.PATH || gui.App.argv[0] || null

var editor = new Editor(path);

var opener = $("#openFile");
opener.change(function(evt) {
  var win = gui.Window.open(editorWindowURL + '?path=' + this.files[0].path, {
    position: 'center',
    width: 800,
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
    if (confirm('You have unsaved files. Save before closing?')) {
      for(var p in unsavedFiles) {
        if(unsavedFiles.hasOwnProperty(p)) {
          fs.writeFileSync(p, unsavedFiles[p], "utf8");
        }
      }
    }
  }
  this.close(true);
  editor.window = null;
});

