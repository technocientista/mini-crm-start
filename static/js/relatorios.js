(function () {
    function ativarAba(nomeAba, atualizarUrl) {
        const botoes = document.querySelectorAll("[data-report-tab]");
        const paineis = document.querySelectorAll("[data-report-panel]");
        const abaExiste = document.querySelector(`[data-report-tab="${nomeAba}"]`);

        if (!abaExiste) {
            return;
        }

        botoes.forEach(function (botao) {
            const ativa = botao.dataset.reportTab === nomeAba;
            botao.classList.toggle("active", ativa);
            botao.setAttribute("aria-selected", ativa ? "true" : "false");
        });

        paineis.forEach(function (painel) {
            const ativo = painel.dataset.reportPanel === nomeAba;
            painel.classList.toggle("active", ativo);
            painel.hidden = !ativo;
        });

        if (atualizarUrl && window.history.replaceState) {
            const destino = nomeAba === "canceladas" ? "#canceladas" : "#detalhamento";
            window.history.replaceState(null, "", destino);
        }
    }

    document.querySelectorAll("[data-report-tab]").forEach(function (botao) {
        botao.addEventListener("click", function () {
            ativarAba(botao.dataset.reportTab, true);
        });
    });

    if (window.location.hash === "#canceladas") {
        ativarAba("canceladas", false);
    }
})();
