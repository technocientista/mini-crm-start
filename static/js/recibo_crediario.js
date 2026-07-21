(function () {
    if (document.body.dataset.autoPrint !== "1") {
        return;
    }

    window.addEventListener("load", function () {
        window.setTimeout(function () {
            window.print();
        }, 250);
    });
})();
