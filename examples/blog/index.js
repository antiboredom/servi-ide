useDatabase('blog');
serveFiles('public');

route('/', home);
route('/new', newEntry);
route('/entries/:id', showEntry);

function home(request) {
    var data = database.find({});
    data.sort({ date: -1 });
    data.exec(function(err, entries){
        request.render('templates/home.html', {entries: entries});
    });
}

function newEntry(request) {
  if (request.method == GET) {
    request.render('templates/form.html');
  }

  else if (request.method == POST) {
    var image = request.files.image;
    uploadFile(image, "public/uploads");

    var blogEntry = {
        content: request.fields.content,
        title: request.fields.title,
        date: new Date(),
        image: image.name
    }
    database.insert(blogEntry);
    request.redirect('/');
  }
}

function showEntry(request) {
  var id = request.params.id;
  database.findOne({'_id': id}, function(err, theEntry){
     request.render('templates/blogpost.html', {entry: theEntry}); 
  });
}