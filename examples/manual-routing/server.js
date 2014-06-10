function run(request) {
    var path = request.path;

    if (path == "/") {
        request.respond("Landing page");
    } else if (path == "/one") {
        request.respond("Path one");
    } else if (path == "/two") {
        request.respond("Path two");
    } else {
        request.respond("Every other path");
    }
}