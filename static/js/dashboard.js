(function () {
    window.abrirModalDashboard = function (id) {
        abrirModalPorId(id);
    };

    window.fecharModalDashboard = function (id) {
        fecharModalPorId(id);
    };

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            document.querySelectorAll(".dashboard-modal.show").forEach(function (modal) {
                modal.classList.remove("show");
            });
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        const page = document.querySelector("[data-dashboard-modal-aberto]");
        const modalAberto = page ? page.dataset.dashboardModalAberto : "";

        if (modalAberto) {
            abrirModalPorId(modalAberto);
        }
    });
})();
