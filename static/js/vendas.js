(function () {
    let itensVenda = [];
    let clienteSelecionado = null;
    let clienteBuscaTimer = null;
    let produtoSelecionado = null;
    let produtoBuscaTimer = null;
    let atualizandoResumo = false;
    let vendaProntaParaEnviar = false;

    const produtoBuscaInput = document.getElementById("produto_busca");
    const produtoIdInput = document.getElementById("produto_id");
    const produtoResultados = document.getElementById("produto_resultados");
    const produtoSelecionadoInfo = document.getElementById("produto_selecionado_info");
    const quantidadeInput = document.getElementById("quantidade");

    const clienteBuscaInput = document.getElementById("cliente_busca");
    const clienteIdInput = document.getElementById("cliente_id");
    const clienteResultados = document.getElementById("cliente_resultados");
    const clienteSelecionadoInfo = document.getElementById("cliente_selecionado_info");

    const descontoTipoInput = document.getElementById("desconto_tipo");
    const descontoInput = document.getElementById("desconto_input");
    const descontoTotalInput = document.getElementById("desconto_total");
    const valorFinalInput = document.getElementById("valor_final_input");

    const itensTabela = document.getElementById("itensTabela");
    const preview = document.getElementById("preview-venda");
    const itensJsonInput = document.getElementById("itens_json");

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

        toast.innerHTML = `
            <div class="crm-toast-icon">${icones[tipo] || "i"}</div>

            <div class="crm-toast-content">
                <div class="crm-toast-title">${titulo || titulos[tipo] || "Informação"}</div>
                <div class="crm-toast-message">${mensagem}</div>
            </div>

            <button type="button" class="crm-toast-close" aria-label="Fechar">×</button>
        `;

        const fecharToast = function () {
            toast.classList.add("hide");

            setTimeout(function () {
                toast.remove();
            }, 220);
        };

        toast.querySelector(".crm-toast-close").addEventListener("click", fecharToast);

        container.appendChild(toast);

        setTimeout(fecharToast, 4500);
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
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
                <td>${item.nome}</td>
                <td>${item.sku || "-"}</td>
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

    function calcularSubtotalVenda() {
        return itensVenda.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    }

    function calcularDescontoEmValor(subtotal) {
        const tipo = descontoTipoInput.value;
        const descontoInformado = Number(descontoInput.value || 0);
        return tipo === "percentual" ? subtotal * (descontoInformado / 100) : descontoInformado;
    }

    function atualizarResumo() {
        if (atualizandoResumo || !preview) {
            return;
        }

        atualizandoResumo = true;

        const subtotal = calcularSubtotalVenda();
        let descontoValor = calcularDescontoEmValor(subtotal);

        descontoValor = Math.max(0, Math.min(descontoValor, subtotal));
        const total = subtotal - descontoValor;

        descontoTotalInput.value = descontoValor.toFixed(2);
        valorFinalInput.value = total.toFixed(2);

        if (descontoValor > 0) {
            valorFinalInput.removeAttribute("readonly");
            valorFinalInput.classList.remove("readonly-input");
        } else {
            valorFinalInput.setAttribute("readonly", "readonly");
            valorFinalInput.classList.add("readonly-input");
        }

        preview.textContent = `Subtotal: ${formatarMoeda(subtotal)} | Desconto: ${formatarMoeda(descontoValor)} | Total: ${formatarMoeda(total)}`;

        const pagamentoResumoSubtotal = document.getElementById("pagamento_resumo_subtotal");
        const pagamentoResumoDesconto = document.getElementById("pagamento_resumo_desconto");
        const pagamentoResumoTotal = document.getElementById("pagamento_resumo_total");

        if (pagamentoResumoSubtotal) {
            pagamentoResumoSubtotal.textContent = formatarMoeda(subtotal);
        }

        if (pagamentoResumoDesconto) {
            pagamentoResumoDesconto.textContent = formatarMoeda(descontoValor);
        }

        if (pagamentoResumoTotal) {
            pagamentoResumoTotal.textContent = formatarMoeda(total);
        }

        atualizandoResumo = false;

        atualizarResumoPagamentos();
    }

    window.prepararVenda = function () {
        if (vendaProntaParaEnviar) {
            return true;
        }

        if (itensVenda.length === 0) {
            mostrarToast(
                "Adicione pelo menos um produto à venda.",
                "warning",
                "Venda sem produtos"
            );
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

            const totalVenda = Number(valorFinalInput.value || 0);

            const totalPagamentos =
                (formasSelecionadas.includes("PIX") ? converterDinheiroParaNumero(document.getElementById("valor_pix")?.value) : 0) +
                (formasSelecionadas.includes("DINHEIRO") ? converterDinheiroParaNumero(document.getElementById("valor_dinheiro")?.value) : 0) +
                (formasSelecionadas.includes("CARTAO") ? converterDinheiroParaNumero(document.getElementById("valor_cartao")?.value) : 0);

            if (Math.abs(totalVenda - totalPagamentos) > 0.009) {
                mostrarToast(
                    "O total dos pagamentos precisa ser igual ao valor final da venda.",
                    "error",
                    "Pagamento incompleto"
                );
                return false;
            }
        }

        const vendedorSelecionado = document.getElementById("vendedor_id")?.value || "";

        if (!vendedorSelecionado) {
            abrirModalVendedor();
            return false;
        }

        preencherItensJson();

        const formVenda = document.getElementById("formVenda");

        if (formVenda) {
            formVenda.setAttribute("target", "_blank");

            setTimeout(function () {
                window.location.href = "/vendas";
            }, 800);
        }

        return true;
    };

    function preencherItensJson() {
        itensJsonInput.value = JSON.stringify(itensVenda.map(item => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade
        })));
    }

    window.abrirModalVendedor = function () {
        const modal = document.getElementById("modalVendedor");
        const selectModal = document.getElementById("modal_vendedor_id");

        if (selectModal) {
            selectModal.value = "";
        }
        abrirModalPorId("modalVendedor");
    };

    window.fecharModalVendedor = function () {
        const selectModal = document.getElementById("modal_vendedor_id");

        if (selectModal) {
            selectModal.value = "";
        }
        fecharModalPorId("modalVendedor");
    };

    window.confirmarVendedorEVender = function () {
        const selectModal = document.getElementById("modal_vendedor_id");
        const vendedorSelecionado = selectModal ? selectModal.value : "";

        if (!vendedorSelecionado) {
            mostrarToast(
                "Selecione o vendedor responsável pela venda.",
                "warning",
                "Venda sem vendedor"
            );
            return;
        }

        const formVenda = document.getElementById("formVenda");

        document.getElementById("vendedor_id").value = vendedorSelecionado;

        preencherItensJson();

        vendaProntaParaEnviar = true;

        if (formVenda) {
            formVenda.setAttribute("target", "_blank");
            formVenda.submit();
        }

        fecharModalVendedor();

        mostrarToast(
            "Venda enviada. O recibo térmico será aberto em uma nova aba.",
            "success",
            "Venda finalizada"
        );

        setTimeout(function () {
            window.location.href = "/vendas";
        }, 800);
    };

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
            produtoResultados.innerHTML = `<div class="autocomplete-empty">Nenhum produto encontrado.</div>`;
            produtoResultados.classList.add("show");
            return;
        }

        produtos.forEach(produto => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "autocomplete-item";
            item.innerHTML = `
                <strong>${produto.nome}</strong>
                <span>SKU: ${produto.sku || "-"} | Estoque: ${produto.estoque_atual} | ${formatarMoeda(Number(produto.preco_venda || 0))}</span>
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
        produtoResultados.innerHTML = "";
        produtoResultados.classList.remove("show");
    }

    function limparProdutoSelecionado() {
        produtoSelecionado = null;
        produtoIdInput.value = "";
        produtoBuscaInput.value = "";
        produtoSelecionadoInfo.textContent = "Nenhum produto selecionado.";
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
            clienteResultados.innerHTML = `<div class="autocomplete-empty">Nenhum cliente encontrado.</div>`;
            clienteResultados.classList.add("show");
            return;
        }

        clientes.forEach(cliente => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "autocomplete-item";
            item.innerHTML = `
                <strong>${cliente.nome}</strong>
                <span>Telefone: ${cliente.telefone || "-"} | Endereço: ${cliente.endereco_completo || "-"}</span>
            `;
            item.addEventListener("click", () => selecionarCliente(cliente));
            clienteResultados.appendChild(item);
        });

        clienteResultados.classList.add("show");
    }

    function selecionarCliente(cliente) {
        clienteSelecionado = cliente;
        clienteIdInput.value = cliente.id;
        clienteBuscaInput.value = cliente.nome;
        clienteSelecionadoInfo.textContent = `Selecionado: ${cliente.nome} | Telefone: ${cliente.telefone || "-"}`;
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

        clienteSelecionado = cliente;
        clienteIdInput.value = cliente.id;
        clienteBuscaInput.value = cliente.nome;

        let texto = `Cliente selecionado: ${cliente.nome}`;
        if (cliente.telefone) {
            texto += ` - ${cliente.telefone}`;
        }

        clienteSelecionadoInfo.textContent = texto;
        clienteResultados.innerHTML = "";
        clienteResultados.classList.remove("show");
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

    function atualizarDescontoPeloValorFinal() {
        const descontoAtual = Number(descontoTotalInput.value || 0);

        if (descontoAtual <= 0) {
            valorFinalInput.value = calcularSubtotalVenda().toFixed(2);
            return;
        }

        if (atualizandoResumo) {
            return;
        }

        atualizandoResumo = true;

        const subtotal = calcularSubtotalVenda();
        let valorFinal = Number(valorFinalInput.value || 0);
        valorFinal = Math.max(0, Math.min(valorFinal, subtotal));

        const descontoValor = subtotal - valorFinal;

        if (descontoTipoInput.value === "percentual") {
            const percentual = subtotal > 0 ? (descontoValor / subtotal) * 100 : 0;
            descontoInput.value = percentual.toFixed(2);
        } else {
            descontoInput.value = descontoValor.toFixed(2);
        }

        descontoTotalInput.value = descontoValor.toFixed(2);
        preview.textContent = `Subtotal: ${formatarMoeda(subtotal)} | Desconto: ${formatarMoeda(descontoValor)} | Total: ${formatarMoeda(valorFinal)}`;
        const pagamentoResumoSubtotal = document.getElementById("pagamento_resumo_subtotal");
        const pagamentoResumoDesconto = document.getElementById("pagamento_resumo_desconto");
        const pagamentoResumoTotal = document.getElementById("pagamento_resumo_total");

        if (pagamentoResumoSubtotal) {
            pagamentoResumoSubtotal.textContent = formatarMoeda(subtotal);
        }

        if (pagamentoResumoDesconto) {
            pagamentoResumoDesconto.textContent = formatarMoeda(descontoValor);
        }

        if (pagamentoResumoTotal) {
            pagamentoResumoTotal.textContent = formatarMoeda(valorFinal);
        }

        atualizarResumoPagamentos();
        atualizandoResumo = false;
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
                    headers: { "Content-Type": "application/json" },
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
                    headers: { "Content-Type": "application/json" },
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

    function dinheiroParaNumero(valor) {
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

    function numeroParaDinheiro(valor) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function obterTotalFinalVenda() {
        const campoValorFinal = document.getElementById("valor_final");

        if (campoValorFinal) {
            return dinheiroParaNumero(campoValorFinal.value);
        }

        return 0;
    }

    function atualizarResumoVenda() {
        const subtotal = calcularSubtotalVenda();
        const desconto = calcularDescontoVenda(subtotal);
        const valorFinal = subtotal - desconto;

        subtotalInput.value = subtotal.toFixed(2);
        descontoTotalInput.value = desconto.toFixed(2);
        valorFinalInput.value = valorFinal.toFixed(2);

        totalVendaResumo.textContent = formatarMoeda(valorFinal);

        atualizarResumoPagamentos();
    }

    function atualizarResumoPagamentos() {
        const formasSelecionadas = obterFormasPagamentoSelecionadas();

        if (formasSelecionadas.length <= 1) {
            return;
        }

        const totalVenda = Number(valorFinalInput?.value || 0);

        const pix = formasSelecionadas.includes("PIX")
            ? converterDinheiroParaNumero(document.getElementById("valor_pix")?.value)
            : 0;

        const dinheiro = formasSelecionadas.includes("DINHEIRO")
            ? converterDinheiroParaNumero(document.getElementById("valor_dinheiro")?.value)
            : 0;

        const cartao = formasSelecionadas.includes("CARTAO")
            ? converterDinheiroParaNumero(document.getElementById("valor_cartao")?.value)
            : 0;

        const totalInformado = pix + dinheiro + cartao;
        const diferenca = totalVenda - totalInformado;

        const totalVendaEl = document.getElementById("total_venda_pagamento");
        const totalInformadoEl = document.getElementById("total_pagamentos_informado");
        const restanteEl = document.getElementById("total_pagamentos_restante");
        const labelRestanteEl = document.getElementById("label_pagamento_restante");

        if (totalVendaEl) {
            totalVendaEl.textContent = formatarMoeda(totalVenda);
        }

        if (totalInformadoEl) {
            totalInformadoEl.textContent = formatarMoeda(totalInformado);
        }

        if (restanteEl) {
            restanteEl.classList.remove("text-danger", "text-success");

            if (Math.abs(diferenca) <= 0.009) {
                restanteEl.textContent = formatarMoeda(0);
                restanteEl.classList.add("text-success");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Pagamento fechado";
                }
            } else if (diferenca > 0) {
                restanteEl.textContent = formatarMoeda(diferenca);
                restanteEl.classList.add("text-danger");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Falta informar";
                }
            } else {
                restanteEl.textContent = formatarMoeda(Math.abs(diferenca));
                restanteEl.classList.add("text-danger");

                if (labelRestanteEl) {
                    labelRestanteEl.textContent = "Valor informado a mais";
                }
            }
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
        const areaDividida = document.getElementById("pagamento_dividido_area");

        const ehPagamentoDividido = formasSelecionadas.length > 1;

        if (pagamentoDivididoInput) {
            pagamentoDivididoInput.value = ehPagamentoDividido ? "1" : "0";
        }

        if (formaPagamentoInput) {
            formaPagamentoInput.value = formasSelecionadas.length === 1 ? formasSelecionadas[0] : "";
        }

        if (areaDividida) {
            areaDividida.style.display = ehPagamentoDividido ? "block" : "none";
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

    ["valor_pix", "valor_dinheiro", "valor_cartao", "valor_final_input"].forEach(function(id) {
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
            produtoSelecionadoInfo.textContent = "Nenhum produto selecionado.";

            clearTimeout(produtoBuscaTimer);
            produtoBuscaTimer = setTimeout(() => buscarProdutos(termo), 300);
        });

        clienteBuscaInput.addEventListener("input", () => {
            const termo = clienteBuscaInput.value.trim();
            clienteSelecionado = null;
            clienteIdInput.value = "";
            clienteSelecionadoInfo.textContent = "Nenhum cliente selecionado. A venda será registrada sem identificação.";

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

        descontoInput.addEventListener("input", atualizarResumo);
        descontoTipoInput.addEventListener("change", atualizarResumo);
        valorFinalInput.addEventListener("input", atualizarDescontoPeloValorFinal);
    }

    document.addEventListener("DOMContentLoaded", function () {
        configurarEventos();
        configurarFormularioNovoProduto();
        configurarFormularioNovoCliente();
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
                "Adicione pelo menos um produto antes de avançar para Cliente ou Pagamento.",
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
