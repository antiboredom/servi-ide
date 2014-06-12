Mousetrap.bind(['command+r', 'ctrl+r'], function(e) {
  editor.run();
  return false;
});

Mousetrap.bind(['command+o', 'ctrl+o'], function(e) {
  editor.openProjectFolder();
});

Mousetrap.bind(['command+s', 'ctrl+s'], function(e) {
  editor.saveFile();
});

Mousetrap.bind(['command+shift+s', 'ctrl+shift+s'], function(e) {
  editor.saveFileAs();
});

Mousetrap.bind(['command+n', 'ctrl+n'], function(e) {
  editor.newFile();
});

Mousetrap.bind(['command+shift+n', 'ctrl+shift+n'], function(e) {
  editor.newWindow();
});

Mousetrap.bind(['command+w', 'ctrl+w'], function(e) {
  editor.close();
});

Mousetrap.bind(['command+alt+j', 'ctrl+alt+j'], function(e) {
  editor.window.showDevTools();
});

Mousetrap.stopCallback = function(e, element, combo) {
  return false;
}
