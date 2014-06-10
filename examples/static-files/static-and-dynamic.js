serveFiles('public');

route('/hello', hello);
function hello(request) {
  request.respond('hello');
}
