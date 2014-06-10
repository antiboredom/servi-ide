route("/:name", index);
route("/people/:name/:adjective", people);

function index(request) {
    var name = request.params.name;
    request.respond("Hello " + name);
}

function people(request) {
    var name = request.params.name;
    var adjective = request.params.adjective;
    request.respond(name + " is " + adjective);
}