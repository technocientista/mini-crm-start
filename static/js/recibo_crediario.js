(function () {
    if (document.body.dataset.autoPrint !== "1") {
        return;
    }

    const returnUrl = document.body.dataset.returnUrl;
    let printStarted = false;

    function startPrint() {
        if (printStarted) {
            return;
        }

        printStarted = true;
        window.print();
    }

    window.addEventListener("load", function () {
        window.setTimeout(startPrint, 350);
    });

    window.addEventListener("afterprint", function () {
        if (!returnUrl) {
            return;
        }

        window.setTimeout(function () {
            window.location.replace(returnUrl);
        }, 150);
    });
})();
