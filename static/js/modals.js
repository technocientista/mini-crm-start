function abrirModalPorId(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add("show");
    }
}

function fecharModalPorId(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove("show");
    }
}

window.abrirModalCliente = () => abrirModalPorId("modalCliente");
window.fecharModalCliente = () => fecharModalPorId("modalCliente");
window.abrirModalImportarClientes = () => abrirModalPorId("modalImportarClientes");
window.fecharModalImportarClientes = () => fecharModalPorId("modalImportarClientes");

window.abrirModalProduto = () => abrirModalPorId("modalProduto");
window.fecharModalProduto = () => fecharModalPorId("modalProduto");
window.abrirModalImportarProdutos = () => abrirModalPorId("modalImportarProdutos");
window.fecharModalImportarProdutos = () => fecharModalPorId("modalImportarProdutos");

window.abrirModalAjusteEstoque = () => abrirModalPorId("modalAjusteEstoque");
window.fecharModalAjusteEstoque = () => fecharModalPorId("modalAjusteEstoque");

window.abrirModalCancelamento = () => abrirModalPorId("modalCancelamentoVenda");
window.fecharModalCancelamento = () => fecharModalPorId("modalCancelamentoVenda");
