//http://localhost/?name=Sam&adjective=cool
function run(request) {
    var params = request.params;

    console.log(params);
    request.respond(params.name + " is " + params.adjective);
}