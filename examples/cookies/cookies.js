function run(request){
    request.respond("hello " + request.cookies.get("name"));
}

route("/setName/:name", function(request){
   request.cookies.set("name", request.params.name);
   request.redirect("/");
});
