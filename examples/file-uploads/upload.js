serveFiles('uploads');

route('/', form);
function form(request){
    request.serveFile('form.html');
}

route('/upload', upload);
function upload(request) {
    var file = request.files.file;
    uploadFile(file, "uploads");
    request.respond('<img src="' + file.name  + '">');
}