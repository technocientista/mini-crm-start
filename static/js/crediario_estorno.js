(function () {
    const modal = document.getElementById("modalEstornoRecebimento");
    const form = document.getElementById("receivableReversalForm");
    const description = document.getElementById("descricaoEstornoRecebimento");
    const reason = document.getElementById("motivo_estorno");

    if (!modal || !form) {
        return;
    }

    function closeModal() {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        form.removeAttribute("action");
        form.reset();
    }

    document.querySelectorAll("[data-reversal-url]").forEach(function (button) {
        button.addEventListener("click", function () {
            form.action = button.dataset.reversalUrl;
            description.textContent = "O recebimento #" + button.dataset.receiptId + " será estornado e o saldo das vendas será restaurado.";
            modal.classList.add("show");
            modal.setAttribute("aria-hidden", "false");
            window.setTimeout(function () {
                reason.focus();
            }, 50);
        });
    });

    modal.querySelectorAll("[data-close-reversal]").forEach(function (button) {
        button.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeModal();
        }
    });
})();
