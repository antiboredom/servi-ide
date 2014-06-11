var Path = require('path');
var saw = require('saw');
var util = require('util');
var fs = require('fs');
var find = require('findit');

function FileTree(path, editor) {
  this.path = path;
  this.editor = editor;
  this.load();
  this.display();
  $('#project-name').text(Path.basename(path));

  var self = this;

  saw(path).on('all', function (ev, file) {
    self.load();
    self.$tree.tree('loadData', self.files);
  });
}

FileTree.prototype.load = function() {
  this.files = dirTree(this.path).children;
};

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
      if (node.name[0] === '.') {
        $li.hide();
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
};

FileTree.prototype.selectNodeByPath = function(path) {
  var node = this.$tree.tree('getNodeByPath', path);
  this.$tree.find('li').removeClass('selected');
  $(node.element).addClass('selected');
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

