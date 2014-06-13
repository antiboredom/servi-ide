var Path = require('path');
var saw = require('saw');
var util = require('util');
var fs = require('fs');
var gui = require('nw.gui');

function FileTree(path, editor) {
  this.path = path;
  if (this.path !== null) {
    this.filepath = this.path;
    this.path = Path.dirname(this.filepath);
  }
  this.temporaryFiles = [];
  this.editor = editor;
  this.files = [];
  this.watching = false;
  this.load();
  this.display();
  if (this.filepath) {
    this.editor.openFile(this.filepath);
    this.selectNodeByPath(this.filepath);
  }
}

FileTree.prototype.load = function() {
  if (this.path === null) {
    this.loadTempFiles();
  } else {
    this.files = dirTree(this.path).children;
    this.loadTempFiles();
    this.watch();
    //$('#project-name').text(Path.basename(path));
  }
};

FileTree.prototype.loadTempFiles = function() {
  for (var i = 0; i < this.temporaryFiles.length; i ++) {
    this.$tree.tree('appendNode', {
      label: 'Untitled ' + (i+1),
      path: this.temporaryFiles[i],
      type: 'file',
      tmp: true
    });
  }
}

FileTree.prototype.addTempFile = function(path) {
  this.temporaryFiles.push(path);
  this.$tree.tree('appendNode', {
    label: 'Untitled ' + this.temporaryFiles.length,
    path: path,
    type: 'file',
    tmp: true
  });
  this.selectNodeByPath(path);
}

FileTree.prototype.watch = function() {
  var self = this;
  if (self.watching === false) {
    saw(self.path).on('all', function (ev, file) {
      self.reloadTree();
    });
    self.watching = true;
  }
};

FileTree.prototype.reloadTree = function() {
  this.load();
  this.$tree.tree('loadData', this.files);
  this.loadTempFiles();
  if (this.filepath) {
    this.selectNodeByPath(this.filepath);
  }
}

FileTree.prototype.display = function() {
  var self = this;

  this.$tree = $('#filetree');

  this.$tree.tree({
    data: this.files,
    autoOpen: false,
    dragAndDrop: false,
    selectable: false,
    slide: false,
    onCreateLi: function(node, $li) {
      if (node.name === 'export' || node.name[0] === '.') {
        try {
          $li.hide();
        } catch(e) {}
      }
    }
  });

  this.$tree.bind('tree.click',
    function(event) {
      event.preventDefault();
      var node = event.node;
      if (node.type === 'file') {
        self.$tree.find('li').removeClass('selected');
        $(node.element).addClass('selected');
        self.filepath = node.path;
        self.editor.openFile(node.path);
      } else {
        if (node.is_open) {
          self.$tree.tree('closeNode', node, false);
        } else {
          self.$tree.tree('openNode', node, false);
        }
      }
    }
  );

  this.$tree.bind(
    'tree.contextmenu',
    function(event) {
      var node = event.node;
      var fileTreeMenu = new gui.Menu();
      //fileTreeMenu.append(new gui.MenuItem({ label: 'Rename', click: function(){
        //console.log('hi');
      //}}));
      //fileTreeMenu.append(new gui.MenuItem({ label: 'Delete', click: function(){
        //console.log('hi');
      //}}));
      fileTreeMenu.append(new gui.MenuItem({ label: 'Reveal', click: function(){
        gui.Shell.showItemInFolder(node.path);
      }}));
      fileTreeMenu.popup(event.click_event.clientX, event.click_event.clientY);
    }
  );
};

FileTree.prototype.selectNodeByPath = function(path) {
  var node = this.$tree.tree('getNodeByPath', path);
  this.$tree.find('li').removeClass('selected');
  if (node) {
    $(node.element).addClass('selected');
  }
}

FileTree.prototype.updateSelectedLabel = function(label, path) {
  var node = this.$tree.tree('getNodeByPath', path);
  if (node)
    this.$tree.tree('updateNode', node, label);
}

function dirTree(filename) {
  var stats = fs.lstatSync(filename);
  var label = Path.basename(filename);
  var info = {
    path: filename,
    label: label
  };

  if (stats.isDirectory()) {
    info.type = "folder";
    info.children = fs.readdirSync(filename).map(function(child) {
      return dirTree(filename + '/' + child);
    });
  } else {
    // Assuming it's a file. In real life it could be a symlink or
    // something else!
    info.type = "file";
  }
  return info;
}


