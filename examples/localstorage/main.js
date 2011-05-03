$(document).ready(function() {
    function updateThings() {
        var things = $("#things");
        things.empty();
        for (var i = 0; i < window.localStorage.length; i++) {
            var key = localStorage.key(i);
            var value = localStorage.getItem(key);
            things.append($("<li>").text(key + ": " + value));
        }
    }

    // simulate submission click upon user hitting enter
    $('#newthing').keypress(function(e){
        if(e.which == 13) {
            $('#dothing').click();
            e.preventDefault();
        }
    });

    $("#dothing").click(function(e) {
        localStorage.setItem(String(localStorage.length), $("#newthing").val());
        updateThings();
        $("#newthing").val("");
    });

    updateThings();
});
