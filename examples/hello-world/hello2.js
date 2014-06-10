
route("*", main);

function main(request) {
    request.respond("hello!");
}