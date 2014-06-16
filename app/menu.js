var menubar = new gui.Menu({ type: 'menubar' });
var fileMenu = new gui.Menu();

fileMenu.append(new gui.MenuItem({ label: 'New File \t\t\u2318N', click: function(){
  editor.newFile();
}}));

fileMenu.append(new gui.MenuItem({ label: 'New Window \t\u21E7\u2318N', click: function(){
  editor.newWindow();
}}));

fileMenu.append(new gui.MenuItem({ label: 'Open \t\t\t\u2318O', click: function(){
  editor.openProjectFolder();
}}));

fileMenu.append(new gui.MenuItem({ label: 'Close \t\t\t\u2318W', click: function(){
  editor.closeFile();
}}));

fileMenu.append(new gui.MenuItem({ label: 'Save \t\t\t\u2318S', click: function(){
  editor.saveFile();
}}));

fileMenu.append(new gui.MenuItem({ label: 'Save As \t\t\t\u21E7\u2318S', click: function(){
  editor.saveFileAs();
}}));

fileMenu.append(new gui.MenuItem({ type: 'separator' }));

fileMenu.append(new gui.MenuItem({ label: 'Export \t\t\t\u2318E', click: function(){
  editor.export();
}}));

fileMenu.append(new gui.MenuItem({ label: 'Run \t\t\t\u2318R', click: function(){
  editor.run();
}}));

var help = new gui.Menu();
editor.window.menu = menubar;
editor.window.menu.insert(new gui.MenuItem({ label: 'File', submenu: fileMenu}), 1);
editor.window.menu.append(new gui.MenuItem({ label: 'Help', submenu: help}));

