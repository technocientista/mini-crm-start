(function () {
    let itensVenda = [];
    let clienteSelecionado = null;
    let clienteBuscaTimer = null;
    let produtoSelecionado = null;
    let produtoBuscaTimer = null;
    let atualizandoResumo = false;
    let descontoValidoAtual = true;
    let mensagemDescontoAtual = "";
    let finalizacaoEmAndamento = false;
    let temporizadorFinalizacao = null;

    const produtoBuscaInput = document.getElementById("produto_busca");
    const produtoIdInput = document.getElementById("produto_id");
    const produtoResultados = document.getElementById("produto_resultados");
    const produtoSelecionadoInfo = document.getElementById("produto_selecionado_info");
    const quantidadeInput = document.getElementById("quantidade");

    const clienteBuscaInput = document.getElementById("cliente_busca");
    const clienteIdInput = document.getElementById("cliente_id");
    const clienteResultados = document.getElementById("cliente_resultados");

    const descontoTipoInput = document.getElementById("desconto_tipo");
    const descontoInput = document.getElementById("desconto_input");
    const descontoInputLabel = document.getElementById("desconto_input_label");
    const descontoCalculoInfo = document.getElementById("desconto_calculo_info");
    const descontoTotalInput = document.getElementById("desconto_total");
    const valorFinalInput = document.getElementById("valor_final_input");
    const finalizarVendaButton = document.getElementById("finalizar_venda_button");

    const itensTabela = document.getElementById("itensTabela");
    const itensContador = document.getElementById("itens_contador");
    const preview = document.getElementById("preview-venda");
    const itensJsonInput = document.getElementById("itens_json");
    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content || "";

    function mostrarToast(mensagem, tipo = "info", titulo = "") {
        const container = document.getElementById("toastContainer");

        if (!container) {
            console.warn("Toast container não encontrado.");
            return;
        }

        const titulos = {
            success: "Sucesso",
            error: "Erro",
            warning: "Atenção",
            info: "Informação"
        };

        const icones = {
            success: "✓",
            error: "!",
            warning: "!",
            info: "i"
        };

        const toast = document.createElement("div");
        toast.className = `crm-toast ${tipo}`;
        const icone = document.createElement("div");
        icone.className = "crm-toast-icon";
        icone.textContent = icones[tipo] || "i";

        const conteudo = document.createElement("div");
        conteudo.className = "crm-toast-content";

        const tituloEl = document.createElement("div");
        tituloEl.className = "crm-toast-title";
        tituloEl.textContent = titulo || titulos[tipo] || "Informação";

        const mensagemEl = document.createElement("div");
        mensagemEl.className = "crm-toast-message";
        mensagemEl.textContent = String(mensagem || "");

        const fechar = document.createElement("button");
        fechar.type = "button";
        fechar.className = "crm-toast-close";
        fechar.setAttribute("aria-label", "Fechar");
        fechar.textContent = "×";

        conteudo.append(tituloEl, mensagemEl);
        toast.append(icone, conteudo, fechar);

        const fecharToast = function () {
            toast.classList.add("hide");

            setTimeout(function () {
                toast.remove();
            }, 220);
        };

        fechar.addEventListener("click", fecharToast);

        container.appendChild(toast);

        setTimeout(fecharToast, 4500);
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function escaparHtml(valor) {
        const elemento = document.createElement("div");
        elemento.textContent = String(valor ?? "");
        return elemento.innerHTML;
    }

    function formatarValorMonetario(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function converterDinheiroParaNumero(valor) {
        if (!valor) {
            return 0;
        }

        return Number(
            valor
                .toString()
                .replace(/\./g, "")
                .replace(",", ".")
        ) || 0;
    }

    function formatarCampoMoeda(valor) {
        if (valor === null || valor === undefined) {
            return "0,00";
        }

        let texto = String(valor).trim();

        if (!texto) {
            return "0,00";
        }

        texto = texto
            .replace("R$", "")
            .replace(/\s/g, "")
            .replace(/[^\d,.-]/g, "");

        if (!texto) {
            return "0,00";
        }

        let numero = 0;

        if (texto.includes(",")) {
            texto = texto.replace(/\./g, "").replace(",", ".");
            numero = Number(texto);
        } else {
            numero = Number(texto);
        }

        if (Number.isNaN(numero) || numero < 0) {
            numero = 0;
        }

        return numero.toFixed(2).replace(".", ",");
    }


    function converterCampoMoedaParaNumero(valor) {
        if (valor === null || valor === undefined) {
            return 0;
        }

        let texto = String(valor).trim();

        if (!texto) {
            return 0;
        }

        texto = texto
            .replace("R$", "")
            .replace(/\s/g, "")
            .replace(/[^\d,.-]/g, "");

        if (!texto) {
            return 0;
        }

        if (texto.includes(",")) {
            texto = texto.replace(/\./g, "").replace(",", ".");
        }

        const numero = Number(texto);

        if (Number.isNaN(numero) || numero < 0) {
            return 0;
        }

        return numero;
    }

    function normalizarProduto(produto) {
        return {
            id: Number(produto.id),
            nome: produto.nome || "",
            sku: produto.sku || "",
            preco_custo: Number(produto.preco_custo || 0),
            preco_venda: Number(produto.preco_venda || 0),
            estoque_atual: Number(produto.estoque_atual || 0)
        };
    }

    window.adicionarProduto = function () {
        if (!produtoSelecionado) {
            mostrarToast(
                "Busque e selecione um produto.",
                "warning",
                "Buscar produto"
            );
            return;
        }

        const produtoId = Number(produtoSelecionado.id);
        const nome = produtoSelecionado.nome;
        const sku = produtoSelecionado.sku;
        const preco = Number(produtoSelecionado.preco_venda || 0);
        const estoque = Number(produtoSelecionado.estoque_atual || 0);
        const quantidade = Number(quantidadeInput.value || 0);

        if (quantidade <= 0) {
            mostrarToast(
                "Informe uma quantidade válida.",
                "warning",
                "Quantidade inválida"
            );
            return;
        }

        const itemExistente = itensVenda.find(item => item.produto_id === produtoId);
        const quantidadeAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;

        if ((quantidadeAtualNoCarrinho + quantidade) > estoque) {
            mostrarToast(
                "Quantidade maior que o estoque disponível.",
                "warning",
                "Estoque insuficiente"
            );
            return;
        }

        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            itensVenda.push({
                produto_id: produtoId,
                nome: nome,
                sku: sku,
                preco: preco,
                estoque: estoque,
                quantidade: quantidade
            });
        }

        limparProdutoSelecionado();
        quantidadeInput.value = 1;
        renderizarItens();
    };

    window.removerProduto = function (produtoId) {
        itensVenda = itensVenda.filter(item => item.produto_id !== produtoId);
        renderizarItens();
    };

    function renderizarItens() {
        if (!itensTabela) {
            return;
        }

        if (itensContador) {
            const quantidadeItens = itensVenda.length;
            itensContador.textContent = `${quantidadeItens} ${quantidadeItens === 1 ? "item" : "itens"}`;
        }

        if (itensVenda.length === 0) {
            itensTabela.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">Nenhum produto adicionado.</td>
                </tr>
            `;
            atualizarResumo();
            return;
        }

        itensTabela.innerHTML = "";

        itensVenda.forEach(item => {
            const subtotal = item.preco * item.quantidade;
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td class="pdv-product-name">${escaparHtml(item.nome)}</td>
                <td class="pdv-product-sku">${escaparHtml(item.sku || "-")}</td>
                <td>
                    <div class="quantity-control">
                        <button type="button" class="quantity-button" onclick="diminuirQuantidade(${item.produto_id})" title="Diminuir quantidade">-</button>
                        <span>${item.quantidade}</span>
                        <button type="button" class="quantity-button" onclick="aumentarQuantidade(${item.produto_id})" title="Aumentar quantidade">+</button>
                    </div>
                </td>
                <td>${formatarMoeda(item.preco)}</td>
                <td>${formatarMoeda(subtotal)}</td>
                <td>
                    <button type="button" class="small-danger-button" onclick="removerProduto(${item.produto_id})" title="Remover produto">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
                        </svg>
                    </button>
                </td>
            `;

            itensTabela.appendChild(tr);
        });

        atualizarResumo();
    }

    function calcularSubtotalVendaCentavos() {
        return itensVenda.reduce(function (total, item) {
            const precoCentavos = Math.round(Number(item.preco || 0) * 100);
            return total + (precoCentavos * Number(item.quantidade || 0));
        }, 0);
    }

    function calcularSubtotalVenda() {
        return calcularSubtotalVendaCentavos() / 100;
    }

    function formatarPercentual(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function obterCalculoDesconto(subtotalCentavos) {
        const tipo = descontoTipoInput?.value || "valor";
        const valorBruto = descontoInput?.value ?? "";
        const valorInformado = valorBruto === "" ? Number.NaN : Number(valorBruto);

        if (!Number.isFinite(valorInformado) || valorInformado < 0) {
            return {
                valido: false,
                mensagem: "Informe um valor de desconto válido."
            };
        }

        let descontoCentavos = 0;
        let totalCentavos = subtotalCentavos;

        if (tipo === "percentual") {
            if (valorInformado > 100) {
                return {
                    valido: false,
                    mensagem: "O desconto percentual não pode ultrapassar 100%."
                };
            }

            descontoCentavos = Math.round(
                subtotalCentavos * (valorInformado / 100)
            );
            totalCentavos = subtotalCentavos - descontoCentavos;
        } else if (tipo === "total_final") {
            totalCentavos = Math.round(valorInformado * 100);

            if (totalCentavos > subtotalCentavos) {
                return {
                    valido: false,
                    mensagem: "O total final não pode ser maior que o subtotal da venda."
                };
            }

            descontoCentavos = subtotalCentavos - totalCentavos;
        } else {
            descontoCentavos = Math.round(valorInformado * 100);

            if (descontoCentavos > subtotalCentavos) {
                return {
                    valido: false,
                    mensagem: "O desconto não pode ser maior que o subtotal da venda."
                };
            }

            totalCentavos = subtotalCentavos - descontoCentavos;
        }

        const percentual = subtotalCentavos > 0
            ? (descontoCentavos / subtotalCentavos) * 100
            : 0;

        return {
            valido: true,
            tipo,
            descontoCentavos,
            totalCentavos,
            percentual
        };
    }

    function atualizarApresentacaoCampoDesconto(calculo) {
        const tipo = descontoTipoInput?.value || "valor";

        if (descontoInputLabel) {
            if (tipo === "percentual") {
                descontoInputLabel.textContent = "Desconto (%)";
            } else if (tipo === "total_final") {
                descontoInputLabel.textContent = "Total final desejado";
            } else {
                descontoInputLabel.textContent = "Desconto (R$)";
            }
        }

        if (descontoInput) {
            descontoInput.setAttribute(
                "aria-invalid",
                calculo.valido ? "false" : "true"
            );
        }

        if (!descontoCalculoInfo) {
            return;
        }

        descontoCalculoInfo.classList.toggle(
            "discount-calculation-info--error",
            !calculo.valido
        );

        if (!calculo.valido) {
            descontoCalculoInfo.textContent = calculo.mensagem;
            return;
        }

        const desconto = calculo.descontoCentavos / 100;
        const total = calculo.totalCentavos / 100;

        descontoCalculoInfo.textContent = (
            `Total final: ${formatarMoeda(total)} · `
            + `Desconto: ${formatarMoeda(desconto)} `
            + `(${formatarPercentual(calculo.percentual)}%).`
        );
    }

    function converterTipoDesconto() {
        if (!descontoInput || !descontoTipoInput) {
            return;
        }

        const subtotalCentavos = calcularSubtotalVendaCentavos();
        const descontoAtualCentavos = Math.round(
            Number(descontoTotalInput?.value || 0) * 100
        );
        const tipo = descontoTipoInput.value;

        if (tipo === "percentual") {
            const percentual = subtotalCentavos > 0
                ? (descontoAtualCentavos / subtotalCentavos) * 100
                : 0;
            descontoInput.value = percentual.toFixed(2);
            descontoInput.max = "100";
        } else if (tipo === "total_final") {
            descontoInput.value = (
                Math.max(subtotalCentavos - descontoAtualCentavos, 0) / 100
            ).toFixed(2);
            descontoInput.removeAttribute("max");
        } else {
            descontoInput.value = (
                Math.max(descontoAtualCentavos, 0) / 100
            ).toFixed(2);
            descontoInput.removeAttribute("max");
        }

        atualizarResumo();
    }

    function atualizarResumo() {
        if (atualizandoResumo || !preview) {
            return;
        }

        atualizandoResumo = true;

        const subtotalCentavos = calcularSubtotalVendaCentavos();
        const subtotal = subtotalCentavos / 100;
        const calculo = obterCalculoDesconto(subtotalCentavos);

        descontoValidoAtual = calculo.valido;
        mensagemDescontoAtual = calculo.mensagem || "";

        const descontoCentavos = calculo.valido
            ? calculo.descontoCentavos
            : 0;
        const totalCentavos = calculo.valido
            ? calculo.totalCentavos
            : subtotalCentavos;
        const descontoValor = descontoCentavos / 100;
        const total = totalCentavos / 100;

        descontoTotalInput.value = descontoValor.toFixed(2);
        valorFinalInput.value = formatarCampoMoeda(total);

        preview.textContent = formatarMoeda(total);
        atualizarApresentacaoCampoDesconto(calculo);
        
        const pagamentoResumoSubtotal = document.getElementById("pagamento_resumo_subtotal");
        const pagamentoResumoDesconto = document.getElementById("pagamento_resumo_desconto");
        const pagamentoResumoTotal = document.getElementById("pagamento_resumo_total");

        if (pagamentoResumoSubtotal) {
            pagamentoResumoSubtotal.textContent = formatarMoeda(subtotal);
        }

        if (pagamentoResumoDesconto) {
            pagamentoResumoDesconto.textContent = calculo.valido
                ? formatarMoeda(descontoValor)
                : "—";
        }

        if (pagamentoResumoTotal) {
            pagamentoResumoTotal.textContent = calculo.valido
                ? formatarMoeda(total)
                : "—";
        }

        atualizandoResumo = false;

        atualizarResumoPagamentos();
    }

    window.prepararVenda = function () {
        if (finalizacaoEmAndamento) {
            return false;
        }

        if (itensVenda.length === 0) {
            mostrarToast(
                "Adicione pelo menos um produto à venda.",
                "warning",
                "Venda sem produtos"
            );
            return false;
        }

        if (!descontoValidoAtual) {
            mostrarToast(
                mensagemDescontoAtual || "Revise o desconto informado.",
                "warning",
                "Desconto inválido"
            );
            descontoInput?.focus();
            return false;
        }

        const subtotal = calcularSubtotalVenda();
        const desconto = Number(descontoTotalInput.value || 0);

        if (desconto > subtotal) {
            mostrarToast(
                "O desconto não pode ser maior que o valor da venda.",
                "error",
                "Desconto inválido"
            );
            return false;
        }

        const formasSelecionadas = obterFormasPagamentoSelecionadas();
        const vendaCrediario = formasSelecionadas.includes("CREDIARIO");

        if (formasSelecionadas.length === 0) {
            mostrarToast(
                "Selecione pelo menos uma forma de pagamento.",
                "warning",
                "Forma de pagamento obrigatória"
            );
            return false;
        }

        const formaPagamentoInput = document.getElementById("forma_pagamento");
        const pagamentoDivididoInput = document.getElementById("pagamento_dividido");
        const vendaCrediarioInput = document.getElementById("venda_crediario");

        if (vendaCrediarioInput) {
            vendaCrediarioInput.value = vendaCrediario ? "1" : "0";
        }

        if (formasSelecionadas.length === 1) {
            if (formaPagamentoInput) {
                formaPagamentoInput.value = formasSelecionadas[0];
            }

            if (pagamentoDivididoInput) {
                pagamentoDivididoInput.value = "0";
            }
        }

        if (formasSelecionadas.length > 1) {
            if (formaPagamentoInput) {
                formaPagamentoInput.value = "MULTIPLO";
            }

            if (pagamentoDivididoInput) {
                pagamentoDivididoInput.value = "1";
            }

            const totalVenda = converterCampoMoedaParaNumero(valorFinalInput.value);

            const totalPagamentos = calcularTotalPagamentosSelecionados(formasSelecionadas);

            const diferencaPagamentos = totalVenda - totalPagamentos;

            if (vendaCrediario && diferencaPagamentos <= 0.009) {
                mostrarToast(
                    "Para usar o crediário, deve existir um saldo maior que zero.",
                    "warning",
                    "Saldo do crediário"
                );
                return false;
            }

            if (!vendaCrediario && diferencaPagamentos > 0.009) {
                mostrarToast(
                    `Falta informar ${formatarMoeda(diferencaPagamentos)} para concluir a venda.`,
                    "warning",
                    "Pagamento incompleto"
                );
                return false;
            }

            if (diferencaPagamentos < -0.009) {
                mostrarToast(
                    `O valor informado ultrapassa o total da venda em ${formatarMoeda(Math.abs(diferencaPagamentos))}.`,
                    "error",
                    "Valor informado a mais"
                );
                return false;
            }
        }

        const vendedorSelecionado = document.getElementById("vendedor_id")?.value || "";

        if (!vendedorSelecionado) {
            mostrarToast(
                "Selecione o vendedor responsável pela venda.",
                "warning",
                "Vendedor obrigatório"
            );
            document.getElementById("vendedor_id")?.focus();
            return false;
        }

        if (vendaCrediario && !clienteIdInput?.value) {
            mostrarToast(
                "Selecione o cliente que ficará responsável pelo saldo.",
                "warning",
                "Cliente obrigatório no crediário"
            );
            clienteBuscaInput?.focus();
            return false;
        }

        if (
            formasSelecionadas.length === 1
            && formasSelecionadas[0] === "DINHEIRO"
        ) {
            const totalVenda = converterCampoMoedaParaNumero(valorFinalInput.value);
            const valorRecebido = converterDinheiroParaNumero(
                document.getElementById("valor_recebido_dinheiro")?.value
            );

            if (valorRecebido < totalVenda) {
                mostrarToast(
                    `Falta informar ${formatarMoeda(totalVenda - valorRecebido)} no valor recebido.`,
                    "warning",
                    "Valor recebido insuficiente"
                );
                document.getElementById("valor_recebido_dinheiro")?.focus();
                return false;
            }
        }

        preencherItensJson();

        const formVenda = document.getElementById("formVenda");

        if (!formVenda) {
            return false;
        }

        finalizacaoEmAndamento = true;
        finalizarVendaButton.disabled = true;
        finalizarVendaButton.setAttribute("aria-disabled", "true");
        finalizarVendaButton.dataset.textoOriginal = finalizarVendaButton.textContent.trim();
        finalizarVendaButton.textContent = "Finalizando...";

        clearTimeout(temporizadorFinalizacao);
        temporizadorFinalizacao = setTimeout(function () {
            if (!finalizacaoEmAndamento) {
                return;
            }

            finalizacaoEmAndamento = false;
            finalizarVendaButton.disabled = false;
            finalizarVendaButton.setAttribute("aria-disabled", "false");
            finalizarVendaButton.textContent =
                finalizarVendaButton.dataset.textoOriginal || "Finalizar venda";

            mostrarToast(
                "A confirmação demorou mais que o esperado. Tente novamente.",
                "warning",
                "Confirmação pendente"
            );
        }, 15000);

        const janelaRecibo = window.open("", "_blank");
        enviarVendaAssincrona(formVenda, janelaRecibo);
        return false;
    };

    async function enviarVendaAssincrona(formVenda, janelaRecibo) {
        try {
            const resposta = await fetch(formVenda.action, {
                method: "POST",
                body: new FormData(formVenda),
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                }
            });
            const tipoConteudo = resposta.headers.get("content-type") || "";
            let resultado = null;

            if (tipoConteudo.includes("application/json")) {
                resultado = await resposta.json();
            } else {
                await resposta.text();
                throw new Error(
                    resposta.status >= 500
                        ? "O servidor não conseguiu concluir a venda. Tente novamente ou contate o administrador."
                        : "O servidor retornou uma resposta inesperada."
                );
            }

            if (!resposta.ok || !resultado?.sucesso) {
                throw new Error(
                    resultado?.mensagem
                    || "Não foi possível finalizar a venda."
                );
            }

            clearTimeout(temporizadorFinalizacao);
            finalizacaoEmAndamento = false;

            if (janelaRecibo && !janelaRecibo.closed) {
                janelaRecibo.location.href = resultado.recibo_url;
            } else {
                window.location.href = resultado.recibo_url;
                return;
            }

            mostrarToast(
                `Venda #${resultado.venda_id} registrada com sucesso.`,
                "success",
                "Venda finalizada"
            );

            setTimeout(function () {
                window.location.href = "/vendas";
            }, 800);
        } catch (erro) {
            clearTimeout(temporizadorFinalizacao);
            finalizacaoEmAndamento = false;

            if (janelaRecibo && !janelaRecibo.closed) {
                janelaRecibo.close();
            }

            finalizarVendaButton.disabled = false;
            finalizarVendaButton.setAttribute("aria-disabled", "false");
            finalizarVendaButton.textContent =
                finalizarVendaButton.dataset.textoOriginal || "Finalizar venda";

            mostrarToast(
                erro.message || "Não foi possível finalizar a venda.",
                "error",
                "Venda não finalizada"
            );
        }
    }

    function preencherItensJson() {
        itensJsonInput.value = JSON.stringify(itensVenda.map(item => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade
        })));
    }

    function buscarProdutos(termo) {
        if (termo.length < 3) {
            produtoResultados.innerHTML = "";
            produtoResultados.classList.remove("show");
            return;
        }

        fetch(`/api/produtos/busca?q=${encodeURIComponent(termo)}`)
            .then(response => response.json())
            .then(renderizarResultadosProdutos)
            .catch(() => {
                produtoResultados.innerHTML = `<div class="autocomplete-empty">Erro ao buscar produtos.</div>`;
                produtoResultados.classList.add("show");
            });
    }

    function renderizarResultadosProdutos(produtos) {
        produtoResultados.innerHTML = "";

        if (!produtos || produtos.length === 0) {
            const resultadoVazio = document.createElement("div");
            resultadoVazio.className = "autocomplete-empty-with-action";

            const mensagem = document.createElement("span");
            mensagem.className = "autocomplete-empty";
            mensagem.textContent = "Nenhum produto encontrado.";

            const botaoCadastrar = document.createElement("button");
            botaoCadastrar.type = "button";
            botaoCadastrar.className = "command-button autocomplete-create-action";
            botaoCadastrar.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.75 7.25 12 3.5l7.25 3.75L12 11 4.75 7.25Z"></path>
                    <path d="M4.75 7.25v9.5L12 20.5l7.25-3.75v-9.5"></path>
                    <path d="M12 11v9.5"></path>
                    <path d="M18.5 2.75v5M16 5.25h5"></path>
                </svg>
                <span>Cadastrar novo produto</span>
            `;
            botaoCadastrar.addEventListener("click", function () {
                produtoResultados.innerHTML = "";
                produtoResultados.classList.remove("show");
                window.abrirModalNovoProdutoVenda();
            });

            resultadoVazio.appendChild(mensagem);
            resultadoVazio.appendChild(botaoCadastrar);
            produtoResultados.appendChild(resultadoVazio);
            produtoResultados.classList.add("show");
            return;
        }

        produtos.forEach(produto => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "autocomplete-item";
            item.innerHTML = `
                <strong>${escaparHtml(produto.nome)}</strong>
                <span>SKU: ${escaparHtml(produto.sku || "-")} | Estoque: ${Number(produto.estoque_atual || 0)} | ${formatarMoeda(Number(produto.preco_venda || 0))}</span>
            `;
            
            
            item.addEventListener("click", () => {
                selecionarProduto(produto);
                window.adicionarProduto();
            });

            produtoResultados.appendChild(item);
        });

        produtoResultados.classList.add("show");
    }

    function selecionarProduto(produto) {
        produtoSelecionado = normalizarProduto(produto);
        produtoIdInput.value = produtoSelecionado.id;
        produtoBuscaInput.value = produtoSelecionado.nome;
        produtoSelecionadoInfo.textContent = `Selecionado: ${produtoSelecionado.nome} | SKU: ${produtoSelecionado.sku || "-"} | Estoque: ${produtoSelecionado.estoque_atual} | ${formatarMoeda(produtoSelecionado.preco_venda)}`;
        produtoSelecionadoInfo.hidden = false;
        produtoResultados.innerHTML = "";
        produtoResultados.classList.remove("show");
    }

    function limparProdutoSelecionado() {
        produtoSelecionado = null;
        produtoIdInput.value = "";
        produtoBuscaInput.value = "";
        produtoSelecionadoInfo.textContent = "";
        produtoSelecionadoInfo.hidden = true;
        produtoResultados.innerHTML = "";
        produtoResultados.classList.remove("show");
    }

    window.aumentarQuantidade = function (produtoId) {
        const item = itensVenda.find(item => item.produto_id === produtoId);

        if (!item) {
            return;
        }

        if (item.quantidade + 1 > item.estoque) {
            mostrarToast(
                "Quantidade maior que o estoque disponível.",
                "warning",
                "Quantidade superior"
            );
            return;
        }

        item.quantidade += 1;
        renderizarItens();
    };

    window.diminuirQuantidade = function (produtoId) {
        const item = itensVenda.find(item => item.produto_id === produtoId);

        if (!item) {
            return;
        }

        if (item.quantidade <= 1) {
            window.removerProduto(produtoId);
            return;
        }

        item.quantidade -= 1;
        renderizarItens();
    };

    function adicionarProdutoSelecionadoOuBuscar() {
        const termo = produtoBuscaInput.value.trim();

        if (produtoSelecionado) {
            window.adicionarProduto();
            return;
        }

        if (termo.length < 3) {
            mostrarToast(
                "Digite ou leia pelo menos 3 caracteres do produto.",
                "warning",
                "Busca de produto"
            );
            return;
        }

        fetch(`/api/produtos/busca?q=${encodeURIComponent(termo)}`)
            .then(response => response.json())
            .then(produtos => {
                if (!produtos || produtos.length === 0) {
                    mostrarToast(
                    "Nenhum produto encontrado.",
                    "warning",
                    "Produto não encontrado"
                );
                    return;
                }

                const produtoExato = produtos.find(produto => produto.sku && produto.sku.toLowerCase() === termo.toLowerCase());

                if (produtoExato) {
                    selecionarProduto(produtoExato);
                    window.adicionarProduto();
                    return;
                }

                if (produtos.length === 1) {
                    selecionarProduto(produtos[0]);
                    window.adicionarProduto();
                    return;
                }

                renderizarResultadosProdutos(produtos);
            })
            .catch(() => {
                mostrarToast(
                    "Erro ao buscar produto.",
                    "error",
                    "Falha na busca"
                );
            });
    }

    function buscarClientes(termo) {
        if (termo.length < 3) {
            clienteResultados.innerHTML = "";
            clienteResultados.classList.remove("show");
            return;
        }

        fetch(`/api/clientes/busca?q=${encodeURIComponent(termo)}`)
            .then(response => response.json())
            .then(renderizarResultadosClientes)
            .catch(() => {
                clienteResultados.innerHTML = `<div class="autocomplete-empty">Erro ao buscar clientes.</div>`;
                clienteResultados.classList.add("show");
            });
    }

    function renderizarResultadosClientes(clientes) {
        clienteResultados.innerHTML = "";

        if (!clientes || clientes.length === 0) {
            const resultadoVazio = document.createElement("div");
            resultadoVazio.className = "autocomplete-empty-with-action";

            const mensagem = document.createElement("span");
            mensagem.className = "autocomplete-empty";
            mensagem.textContent = "Nenhum cliente encontrado.";

            const botaoCadastrar = document.createElement("button");
            botaoCadastrar.type = "button";
            botaoCadastrar.className = "command-button autocomplete-create-action";
            botaoCadastrar.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="9" cy="8" r="3.25"></circle>
                    <path d="M3.75 19a5.25 5.25 0 0 1 10.5 0"></path>
                    <path d="M17.5 7v6M14.5 10h6"></path>
                </svg>
                <span>Cadastrar novo cliente</span>
            `;
            botaoCadastrar.addEventListener("click", function () {
                clienteResultados.innerHTML = "";
                clienteResultados.classList.remove("show");
                window.abrirModalNovoClienteVenda();
            });

            resultadoVazio.appendChild(mensagem);
            resultadoVazio.appendChild(botaoCadastrar);
            clienteResultados.appendChild(resultadoVazio);
            clienteResultados.classList.add("show");
            return;
        }

        clientes.forEach(cliente => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "autocomplete-item";
            item.innerHTML = `
                <strong>${escaparHtml(cliente.nome)}</strong>
                <span>Telefone: ${escaparHtml(cliente.telefone || "-")} | Endereço: ${escaparHtml(cliente.endereco_completo || "-")}</span>
            `;
            item.addEventListener("click", () => selecionarCliente(cliente));
            clienteResultados.appendChild(item);
        });

        clienteResultados.classList.add("show");
    }

    function formatarClienteNoCampo(cliente) {
        return `${cliente.nome} | Telefone: ${cliente.telefone || "-"}`;
    }

    function selecionarCliente(cliente) {
        clienteSelecionado = cliente;
        clienteIdInput.value = cliente.id;
        clienteBuscaInput.value = formatarClienteNoCampo(cliente);
        clienteResultados.innerHTML = "";
        clienteResultados.classList.remove("show");
    }

    window.abrirModalNovoClienteVenda = function () {
        abrirModalPorId("modalNovoClienteVenda");

        const campoNome = document.getElementById("novo_cliente_nome");
        if (clienteBuscaInput && campoNome && clienteBuscaInput.value.trim()) {
            campoNome.value = clienteBuscaInput.value.trim();
        }

        setTimeout(() => campoNome && campoNome.focus(), 100);
    };

    window.fecharModalNovoClienteVenda = function () {
        fecharModalPorId("modalNovoClienteVenda");
    };

    function selecionarClienteCriado(cliente) {
        if (!cliente || !cliente.id) {
            mostrarToast(
                "Cliente inválido retornado pelo sistema.",
                "error",
                "Cliente inválido"
            );
            return;
        }

        selecionarCliente(cliente);
    }

    window.abrirModalNovoProdutoVenda = function () {
        abrirModalPorId("modalNovoProdutoVenda");

        const campoNome = document.getElementById("novo_produto_nome");
        const campoSku = document.getElementById("novo_produto_sku");

        if (produtoBuscaInput && produtoBuscaInput.value.trim()) {
            const valorDigitado = produtoBuscaInput.value.trim();

            if (campoNome && !campoNome.value.trim()) {
                campoNome.value = valorDigitado;
            }

            if (campoSku && !campoSku.value.trim()) {
                campoSku.value = valorDigitado;
            }
        }

        setTimeout(() => campoNome && campoNome.focus(), 100);
    };

    window.fecharModalNovoProdutoVenda = function () {
        fecharModalPorId("modalNovoProdutoVenda");
    };

    function selecionarProdutoCriado(produto) {
        if (!produto || !produto.id) {
            mostrarToast(
                "Produto inválido retornado pelo sistema.",
                "error",
                "Produto inválido"
            );
            return;
        }

        selecionarProduto(produto);
    }

    function configurarFormularioNovoProduto() {
        const form = document.getElementById("formNovoProdutoVenda");
        if (!form) {
            return;
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const botaoSalvar = form.querySelector("button[type='submit']");
            if (botaoSalvar) {
                botaoSalvar.disabled = true;
                botaoSalvar.textContent = "Salvando...";
            }

            const dados = {
                nome: document.getElementById("novo_produto_nome").value.trim(),
                categoria: document.getElementById("novo_produto_categoria").value.trim(),
                marca: document.getElementById("novo_produto_marca").value.trim(),
                sku: document.getElementById("novo_produto_sku").value.trim(),
                preco_custo: document.getElementById("novo_produto_preco_custo").value.trim(),
                preco_venda: document.getElementById("novo_produto_preco_venda").value.trim(),
                estoque_atual: document.getElementById("novo_produto_estoque_atual").value.trim(),
                estoque_minimo: document.getElementById("novo_produto_estoque_minimo").value.trim()
            };

            try {
                const resposta = await fetch("/api/produtos/criar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken
                    },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();
                if (!resposta.ok || !resultado.sucesso || !resultado.produto || !resultado.produto.id) {
                    mostrarToast(
                    resultado.mensagem || "Erro ao criar produto.",
                    "error",
                    "Erro ao criar produto"
                );
                    return;
                }

                selecionarProdutoCriado(resultado.produto);
                form.reset();
                window.fecharModalNovoProdutoVenda();
            } catch (erro) {
                console.error(erro);
                mostrarToast(
                    "Erro ao criar produto. Tente novamente.",
                    "error",
                    "Erro ao criar produto"
                );
            } finally {
                if (botaoSalvar) {
                    botaoSalvar.disabled = false;
                    botaoSalvar.textContent = "Salvar produto";
                }
            }
        });
    }

    function configurarFormularioNovoCliente() {
        const form = document.getElementById("formNovoClienteVenda");
        if (!form) {
            return;
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const botaoSalvar = form.querySelector("button[type='submit']");
            if (botaoSalvar) {
                botaoSalvar.disabled = true;
                botaoSalvar.textContent = "Salvando...";
            }

            const dados = {
                nome: document.getElementById("novo_cliente_nome").value.trim(),
                telefone: document.getElementById("novo_cliente_telefone").value.trim(),
                endereco_completo: document.getElementById("novo_cliente_endereco").value.trim(),
                tags: document.getElementById("novo_cliente_tags").value.trim(),
                observacoes: document.getElementById("novo_cliente_observacoes").value.trim()
            };

            try {
                const resposta = await fetch("/api/clientes/criar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken
                    },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();
                if (!resposta.ok || !resultado.sucesso) {
                    mostrarToast(
                    resultado.mensagem || "Erro ao criar cliente.",
                    "error",
                    "Erro ao criar cliente"
                );
                    return;
                }

                selecionarClienteCriado(resultado.cliente);
                form.reset();
                window.fecharModalNovoClienteVenda();
            } catch (erro) {
                console.error(erro);
                mostrarToast(
                    "Erro ao criar cliente. Tente novamente.",
                    "error",
                    "Erro ao criar cliente"
                );
            } finally {
                if (botaoSalvar) {
                    botaoSalvar.disabled = false;
                    botaoSalvar.textContent = "Salvar cliente";
                }
            }
        });
    }

    function calcularTotalPagamentosSelecionados(formasSelecionadas) {
        return (
            (formasSelecionadas.includes("PIX")
                ? converterDinheiroParaNumero(document.getElementById("valor_pix")?.value)
                : 0) +
            (formasSelecionadas.includes("DINHEIRO")
                ? converterDinheiroParaNumero(document.getElementById("valor_dinheiro")?.value)
                : 0) +
            (formasSelecionadas.includes("CARTAO")
                ? converterDinheiroParaNumero(document.getElementById("valor_cartao")?.value)
                : 0)
        );
    }

    function atualizarEstadoFinalizacao(formasSelecionadas) {
        if (!finalizarVendaButton) {
            return;
        }

        const totalVenda = converterCampoMoedaParaNumero(valorFinalInput?.value);
        const subtotal = calcularSubtotalVenda();
        const desconto = Number(descontoTotalInput?.value || 0);
        const vendedorSelecionado = document.getElementById("vendedor_id")?.value;
        const podeTentarFinalizar =
            itensVenda.length > 0 &&
            totalVenda >= 0 &&
            desconto <= subtotal &&
            descontoValidoAtual &&
            !finalizacaoEmAndamento;

        finalizarVendaButton.disabled = !podeTentarFinalizar;
        finalizarVendaButton.setAttribute(
            "aria-disabled",
            podeTentarFinalizar ? "false" : "true"
        );

        if (!podeTentarFinalizar) {
            if (itensVenda.length === 0) {
                finalizarVendaButton.title = "Adicione pelo menos um produto";
            } else if (!descontoValidoAtual) {
                finalizarVendaButton.title = "Revise o desconto informado";
            } else {
                finalizarVendaButton.title = "Confira os dados da venda";
            }
        } else if (formasSelecionadas.length === 0) {
            finalizarVendaButton.title = "Selecione uma forma de pagamento";
        } else if (!vendedorSelecionado) {
            finalizarVendaButton.title = "Selecione o vendedor responsável";
        } else if (formasSelecionadas.includes("CREDIARIO")) {
            const totalInformado = calcularTotalPagamentosSelecionados(formasSelecionadas);
            const possuiSaldoCrediario = totalInformado < totalVenda - 0.009;
            finalizarVendaButton.title = possuiSaldoCrediario
                ? "Finalizar venda no crediário"
                : "Informe um saldo para o crediário";
        } else if (formasSelecionadas.length > 1) {
            const totalInformado = calcularTotalPagamentosSelecionados(formasSelecionadas);
            const pagamentoFechado = Math.abs(totalVenda - totalInformado) <= 0.009;
            finalizarVendaButton.title = pagamentoFechado
                ? "Finalizar venda"
                : "Finalizar venda e validar os valores informados";
        } else {
            finalizarVendaButton.title = "Finalizar venda";
        }
    }

    function atualizarResumoPagamentos() {
        const formasSelecionadas = obterFormasPagamentoSelecionadas();
        const vendaCrediario = formasSelecionadas.includes("CREDIARIO");
        const totalVenda = converterCampoMoedaParaNumero(valorFinalInput?.value);
        const totalInformado = calcularTotalPagamentosSelecionados(formasSelecionadas);

        atualizarResumoCrediario(vendaCrediario, totalVenda, totalInformado);
        atualizarTrocoDinheiro(formasSelecionadas);

        if (formasSelecionadas.length <= 1) {
            atualizarEstadoFinalizacao(formasSelecionadas);
            return;
        }

        const diferenca = totalVenda - totalInformado;
        const pagamentosFechados = !vendaCrediario && Math.abs(diferenca) <= 0.009;

        const totalInformadoEl = document.getElementById("total_pagamentos_informado");
        const restanteEl = document.getElementById("total_pagamentos_restante");
        const labelRestanteEl = document.getElementById("label_pagamento_restante");

        if (totalInformadoEl) {
            totalInformadoEl.textContent = formatarValorMonetario(totalInformado);
        }

        if (restanteEl) {
            restanteEl.classList.remove("text-danger", "text-success", "text-warning");

            if (vendaCrediario && diferenca > 0.009) {
                restanteEl.textContent = formatarValorMonetario(diferenca);
                restanteEl.classList.add("text-warning");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Saldo no crediário";
                }
            } else if (pagamentosFechados) {
                restanteEl.textContent = formatarValorMonetario(0);
                restanteEl.classList.add("text-success");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Pagamento concluído";
                }
            } else if (totalInformado < totalVenda) {
                restanteEl.textContent = formatarValorMonetario(totalVenda - totalInformado);
                restanteEl.classList.add("text-warning");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Saldo restante";
                }
            } else if (totalInformado > totalVenda) {
                restanteEl.textContent = formatarValorMonetario(totalInformado - totalVenda);
                restanteEl.classList.add("text-danger");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Valor excedente";
                }
            }
        }

        atualizarEstadoFinalizacao(formasSelecionadas);
    }

    function atualizarResumoCrediario(ativo, totalVenda, totalEntrada) {
        const resumo = document.getElementById("crediario_resumo");
        const entradaEl = document.getElementById("crediario_entrada_total");
        const saldoEl = document.getElementById("crediario_saldo");
        const vendaCrediarioInput = document.getElementById("venda_crediario");
        const clienteOpcional = document.getElementById("cliente_label_opcional");

        if (resumo) {
            resumo.hidden = !ativo;
        }

        if (vendaCrediarioInput) {
            vendaCrediarioInput.value = ativo ? "1" : "0";
        }

        if (clienteOpcional) {
            clienteOpcional.textContent = ativo ? "Obrigatório" : "Opcional";
            clienteOpcional.classList.toggle("required", ativo);
        }

        if (entradaEl) {
            entradaEl.textContent = formatarValorMonetario(totalEntrada);
        }

        if (saldoEl) {
            saldoEl.textContent = formatarValorMonetario(
                Math.max(totalVenda - totalEntrada, 0)
            );
            saldoEl.classList.toggle(
                "text-danger",
                ativo && totalEntrada >= totalVenda - 0.009
            );
        }
    }

    function atualizarTrocoDinheiro(formasSelecionadas) {
        const campoRecebido = document.getElementById("valor_recebido_dinheiro");
        const trocoEl = document.getElementById("troco_dinheiro");

        if (!campoRecebido || !trocoEl) {
            return;
        }

        const dinheiroUnico = (
            formasSelecionadas.length === 1
            && formasSelecionadas[0] === "DINHEIRO"
        );

        if (!dinheiroUnico) {
            trocoEl.textContent = formatarValorMonetario(0);
            trocoEl.classList.remove("text-danger", "text-success");
            return;
        }

        const totalVenda = converterCampoMoedaParaNumero(valorFinalInput?.value);
        const valorRecebido = converterDinheiroParaNumero(campoRecebido.value);
        const diferenca = valorRecebido - totalVenda;

        trocoEl.classList.remove("text-danger", "text-success");
        trocoEl.textContent = formatarValorMonetario(Math.abs(diferenca));

        if (diferenca >= -0.009) {
            trocoEl.classList.add("text-success");
        } else {
            trocoEl.classList.add("text-danger");
        }
    }

    function obterFormasPagamentoSelecionadas() {
        return Array.from(document.querySelectorAll(".payment-method-check:checked"))
            .map(function (input) {
                return input.dataset.paymentMethod;
            });
    }

    function atualizarFormaPagamentoVisual() {
        const formasSelecionadas = obterFormasPagamentoSelecionadas();

        const pagamentoDivididoInput = document.getElementById("pagamento_dividido");
        const formaPagamentoInput = document.getElementById("forma_pagamento");
        const vendaCrediarioInput = document.getElementById("venda_crediario");
        const areaDividida = document.getElementById("pagamento_dividido_area");
        const areaDinheiro = document.getElementById("pagamento_dinheiro_area");
        const campoRecebido = document.getElementById("valor_recebido_dinheiro");

        const ehPagamentoDividido = formasSelecionadas.length > 1;
        const vendaCrediario = formasSelecionadas.includes("CREDIARIO");
        const dinheiroUnico = (
            formasSelecionadas.length === 1
            && formasSelecionadas[0] === "DINHEIRO"
        );

        if (pagamentoDivididoInput) {
            pagamentoDivididoInput.value = ehPagamentoDividido ? "1" : "0";
        }

        if (formaPagamentoInput) {
            formaPagamentoInput.value = formasSelecionadas.length === 1 ? formasSelecionadas[0] : "";
        }

        if (vendaCrediarioInput) {
            vendaCrediarioInput.value = vendaCrediario ? "1" : "0";
        }

        if (areaDividida) {
            areaDividida.style.display = ehPagamentoDividido ? "block" : "none";
        }

        if (areaDinheiro) {
            areaDinheiro.style.display = dinheiroUnico ? "grid" : "none";
        }

        if (campoRecebido) {
            if (dinheiroUnico && !campoRecebido.value.trim()) {
                campoRecebido.value = formatarCampoMoeda(
                    converterCampoMoedaParaNumero(valorFinalInput?.value)
                );
            } else if (!dinheiroUnico) {
                campoRecebido.value = "";
            }
        }

        document.querySelectorAll(".payment-value-field").forEach(function (campo) {
            const metodo = campo.dataset.paymentValue;
            const deveMostrar = ehPagamentoDividido && formasSelecionadas.includes(metodo);

            campo.style.display = deveMostrar ? "flex" : "none";

            if (!deveMostrar) {
                const input = campo.querySelector("input");
                if (input) {
                    input.value = "";
                }
            }
        });

        atualizarResumoPagamentos();
    }

    document.querySelectorAll(".payment-method-check").forEach(function (input) {
        input.addEventListener("change", atualizarFormaPagamentoVisual);
    });

    ["valor_pix", "valor_dinheiro", "valor_cartao", "valor_recebido_dinheiro"].forEach(function(id) {
        const campo = document.getElementById(id);

        if (campo) {
            campo.addEventListener("input", atualizarResumoPagamentos);
            campo.addEventListener("change", atualizarResumoPagamentos);
        }
    });

    function configurarEventos() {
        if (!produtoBuscaInput || !clienteBuscaInput) {
            return;
        }

        produtoBuscaInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                adicionarProdutoSelecionadoOuBuscar();
            }
        });

        produtoBuscaInput.addEventListener("input", () => {
            const termo = produtoBuscaInput.value.trim();
            produtoSelecionado = null;
            produtoIdInput.value = "";
            produtoSelecionadoInfo.textContent = "";
            produtoSelecionadoInfo.hidden = true;

            clearTimeout(produtoBuscaTimer);
            produtoBuscaTimer = setTimeout(() => buscarProdutos(termo), 300);
        });

        clienteBuscaInput.addEventListener("input", () => {
            const termo = clienteBuscaInput.value.trim();
            clienteSelecionado = null;
            clienteIdInput.value = "";

            clearTimeout(clienteBuscaTimer);
            clienteBuscaTimer = setTimeout(() => buscarClientes(termo), 300);
        });

        clienteBuscaInput.addEventListener("keydown", event => {
            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();
            const termo = clienteBuscaInput.value.trim();

            if (clienteSelecionado) {
                return;
            }

            if (termo.length < 3) {
                mostrarToast(
                    "Digite pelo menos 3 caracteres para buscar o cliente.",
                    "warning",
                    "Busca de cliente"
                );
                return;
            }

            fetch(`/api/clientes/busca?q=${encodeURIComponent(termo)}`)
                .then(response => response.json())
                .then(clientes => {
                    if (!clientes || clientes.length === 0) {
                        mostrarToast(
                            "Nenhum cliente encontrado.",
                            "warning",
                            "Cliente não encontrado"
                        );
                        return;
                    }

                    if (clientes.length === 1) {
                        selecionarCliente(clientes[0]);
                        return;
                    }

                    renderizarResultadosClientes(clientes);
                })
                .catch(() => {
                    mostrarToast(
                        "Erro ao buscar cliente.",
                        "error",
                        "Falha na busca"
                    );
                });
        });

        document.addEventListener("click", event => {
            if (!event.target.closest(".product-search-group")) {
                produtoResultados.classList.remove("show");
            }

            if (!event.target.closest(".client-search-group")) {
                clienteResultados.classList.remove("show");
            }
        });

        if (descontoInput) {
            descontoInput.addEventListener("input", atualizarResumo);
        }

        if (descontoTipoInput) {
            descontoTipoInput.addEventListener("change", converterTipoDesconto);
        }
    }

    function configurarVendedorResponsavel() {
        const vendedorInput = document.getElementById("vendedor_id");

        if (!vendedorInput) {
            return;
        }

        vendedorInput.value = "";
        window.localStorage.removeItem("pdv_vendedor_id");

        vendedorInput.addEventListener("change", function () {
            atualizarEstadoFinalizacao(obterFormasPagamentoSelecionadas());
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        configurarEventos();
        configurarFormularioNovoProduto();
        configurarFormularioNovoCliente();
        configurarVendedorResponsavel();
        atualizarResumo();
    });

    window.abrirModalVendasCadastradas = function () {
        const modal = document.getElementById("modalVendasCadastradas");

        if (modal) {
            modal.classList.add("show");
        }
    };

    window.fecharModalVendasCadastradas = function () {
        const modal = document.getElementById("modalVendasCadastradas");

        if (modal) {
            modal.classList.remove("show");
        }
    };

    window.abrirModalCancelarVenda = function (vendaId) {
        const modal = document.getElementById("modalCancelarVenda");
        const form = document.getElementById("formCancelarVenda");
        const motivo = document.getElementById("motivo_cancelamento_lista");

        if (!modal || !form) {
            return;
        }

        form.action = `/vendas/${Number(vendaId)}/cancelar`;

        if (motivo) {
            motivo.value = "";
        }

        modal.classList.add("show");
        setTimeout(() => motivo?.focus(), 100);
    };

    window.fecharModalCancelarVenda = function () {
        document.getElementById("modalCancelarVenda")?.classList.remove("show");
    };

    document.addEventListener("DOMContentLoaded", function () {
        if (window.location.hash === "#lista-vendas") {
            abrirModalVendasCadastradas();
        }
    });

    window.irParaEtapaPDV = function (etapa) {
        const etapaAtivaAtual = document.querySelector("[data-step-content].active");
        const nomeEtapaAtual = etapaAtivaAtual ? etapaAtivaAtual.getAttribute("data-step-content") : "";

        const saindoDaEtapaProdutos = nomeEtapaAtual === "produtos" && etapa !== "produtos";

        if (saindoDaEtapaProdutos && itensVenda.length === 0) {
            mostrarToast(
                "Adicione pelo menos um produto antes de avançar para a finalização.",
                "warning",
                "Produto obrigatório"
            );

            return;
        }

        const etapas = document.querySelectorAll("[data-step-content]");
        const botoes = document.querySelectorAll("[data-step-button]");

        etapas.forEach(function (item) {
            item.classList.remove("active");
        });

        botoes.forEach(function (botao) {
            botao.classList.remove("active");
        });

        const etapaAtual = document.querySelector(`[data-step-content="${etapa}"]`);
        const botaoAtual = document.querySelector(`[data-step-button="${etapa}"]`);

        if (etapaAtual) {
            etapaAtual.classList.add("active");
        }

        if (botaoAtual) {
            botaoAtual.classList.add("active");
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };
})();
