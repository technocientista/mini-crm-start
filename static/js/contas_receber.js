(function () {
    const form = document.getElementById("receivablePaymentForm");

    if (!form) {
        return;
    }

    const valorPagamento = document.getElementById("valor_pagamento");
    const formaPagamento = document.getElementById("forma_pagamento_crediario");
    const camposDinheiro = document.getElementById("receivableCashFields");
    const valorRecebido = document.getElementById("valor_recebido");
    const troco = document.getElementById("troco_crediario");
    const saldoCentavos = Number(
        document.getElementById("saldo_cliente_centavos")?.value || 0
    );

    function numeroMoeda(valor) {
        const texto = String(valor || "")
            .replace("R$", "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".");
        const numero = Number(texto);
        return Number.isFinite(numero) ? numero : 0;
    }

    function formatarCampo(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function atualizarDinheiro() {
        const dinheiro = formaPagamento.value === "DINHEIRO";
        camposDinheiro.hidden = !dinheiro;

        if (!dinheiro) {
            valorRecebido.value = "";
            troco.textContent = formatarMoeda(0);
            return;
        }

        if (!valorRecebido.value.trim() && valorPagamento.value.trim()) {
            valorRecebido.value = formatarCampo(numeroMoeda(valorPagamento.value));
        }

        const diferenca = numeroMoeda(valorRecebido.value) - numeroMoeda(valorPagamento.value);
        troco.textContent = formatarMoeda(Math.max(diferenca, 0));
        troco.classList.toggle("text-danger", diferenca < -0.009);
    }

    [valorPagamento, valorRecebido].forEach(function (campo) {
        campo?.addEventListener("blur", function () {
            if (campo.value.trim()) {
                campo.value = formatarCampo(numeroMoeda(campo.value));
            }
            atualizarDinheiro();
        });
        campo?.addEventListener("input", function () {
            campo.setCustomValidity("");
            atualizarDinheiro();
        });
    });

    formaPagamento.addEventListener("change", function () {
        formaPagamento.setCustomValidity("");
        atualizarDinheiro();
    });

    form.addEventListener("submit", function (event) {
        const pagamento = numeroMoeda(valorPagamento.value);
        const saldo = saldoCentavos / 100;

        if (pagamento <= 0) {
            event.preventDefault();
            valorPagamento.setCustomValidity("Informe um pagamento maior que zero.");
            valorPagamento.reportValidity();
            return;
        }

        if (pagamento > saldo + 0.009) {
            event.preventDefault();
            valorPagamento.setCustomValidity("O pagamento não pode ultrapassar o saldo do cliente.");
            valorPagamento.reportValidity();
            return;
        }

        valorPagamento.setCustomValidity("");

        if (
            formaPagamento.value === "DINHEIRO"
            && numeroMoeda(valorRecebido.value) < pagamento - 0.009
        ) {
            event.preventDefault();
            valorRecebido.setCustomValidity("O valor entregue não pode ser menor que o pagamento.");
            valorRecebido.reportValidity();
            return;
        }

        valorRecebido.setCustomValidity("");
        form.querySelector("button[type='submit']").disabled = true;
    });
})();
