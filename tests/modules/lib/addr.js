exports.add = function() {
    var total = 0;
    Array.prototype.slice.call(arguments).forEach(function(x) {
        if (typeof x != 'number') throw "I only like numb3r5";
        total += x;
    });
    return total;
};
