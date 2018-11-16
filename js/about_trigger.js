//just to hide and show an about at the bottom of a page

//Show about function

function show_about() {
    var about_t = document.getElementById("about_text");
    if (about_t.style.display == "block") {
        about_t.style.display = "none";
    } else {
        about_t.style.display = "block";
    }
    
    $('html, body').animate({scrollTop: $("#about_text").offset().top}, 'slow');
}