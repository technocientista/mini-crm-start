(function () {
    function atualizarBotaoTema(tema) {
        const texto = document.getElementById("theme-toggle-text");
        const iconeSol = document.getElementById("theme-icon-sun");
        const iconeLua = document.getElementById("theme-icon-moon");

        if (!texto || !iconeSol || !iconeLua) {
            return;
        }

        if (tema === "dark") {
            texto.textContent = "Modo claro";
            iconeSol.style.display = "block";
            iconeLua.style.display = "none";
        } else {
            texto.textContent = "Modo escuro";
            iconeSol.style.display = "none";
            iconeLua.style.display = "block";
        }
    }

    function aplicarTemaSalvo() {
        const temaSalvo = localStorage.getItem("start_crm_tema") || "dark";
        document.documentElement.setAttribute("data-theme", temaSalvo);
        atualizarBotaoTema(temaSalvo);
    }

    window.alternarTema = function () {
        const temaAtual = document.documentElement.getAttribute("data-theme") || "dark";
        const novoTema = temaAtual === "dark" ? "light" : "dark";

        localStorage.setItem("start_crm_tema", novoTema);
        document.documentElement.setAttribute("data-theme", novoTema);
        atualizarBotaoTema(novoTema);
    };

    document.addEventListener("DOMContentLoaded", aplicarTemaSalvo);
})();
