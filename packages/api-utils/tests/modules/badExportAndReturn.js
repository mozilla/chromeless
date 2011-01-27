// This is a bad module, it asks for exports but also returns a value from
// the define defintion function.
define(['exports'], function (exports) {    
    return 'badExportAndReturn';
});

