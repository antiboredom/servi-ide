route('/', hello);
function hello(request) {
  request.respond('<a href="/cat">click for cat</a>');
}

route('/cat', cat);
function cat(request) {
  request.serveFile('public/cat.jpg');
}
