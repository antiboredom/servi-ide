route("/", index);
route("/one", one);
route("/two", two);

function one(request) {
    request.respond("path one");
}

function two(request) {
    request.respond("path two");
}

function index(request) {
    request.respond("Landing page");
}

function run(request) {
    request.respond("Every other path");
}