route('/', form);
function form(request){
    request.serveFile('form.html');
}

route('/handleform', handleform);
function handleform(request) {
    request.respond("you entered: " + request.fields.name);
}
