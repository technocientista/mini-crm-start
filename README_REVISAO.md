# Revisão técnica do Mini CRM Start

## O que foi revisado nesta versão

- Removidos scripts JavaScript inline dos templates principais e movidos para `static/js/`.
- Removidos estilos CSS inline dos templates de impressão e movidos para `static/css/print/`.
- Corrigido o fluxo do cadastro rápido de produto na venda para manter o produto criado realmente selecionado no JavaScript.
- Padronizado o tema escuro como padrão nos templates principais.
- Corrigido `requirements.txt`, que estava salvo com codificação UTF-16, para UTF-8 comum.
- Mantida a estrutura atual do backend em `app.py` para reduzir risco de quebra das rotas já existentes.

## Novas pastas/arquivos criados

```text
static/js/sidebar.js
static/js/modals.js
static/js/dashboard.js
static/js/vendas.js
static/css/print/recibo.css
static/css/print/recibo_termico.css
static/css/print/caixa_imprimir.css
```

## Validações feitas

- `app.py` compilado com sucesso.
- Arquivos JavaScript validados com `node --check`.
- Renderização testada nas principais páginas com Flask test client:
  - Dashboard
  - Clientes
  - Produtos
  - Estoque
  - Vendas
  - Relatórios
  - Relatório de caixas
  - Caixa
  - Detalhe de caixa
  - Impressão de caixa
  - Detalhe de venda
- Testada a API `/api/produtos/criar` em uma cópia temporária do banco, confirmando criação do produto e da movimentação inicial de estoque.

## Recomendações para próxima etapa

1. Dividir `app.py` em módulos menores usando Blueprints do Flask: `auth`, `clientes`, `produtos`, `vendas`, `caixa`, `relatorios` e `api`.
2. Criar uma pasta `services/` para regras de negócio, como venda, caixa, estoque e WhatsApp.
3. Criar uma pasta `repositories/` para consultas SQL, reduzindo SQL direto dentro das rotas.
4. Criar migrations unificadas ou usar uma ferramenta como Flask-Migrate/Alembic no futuro.
5. Adicionar testes automatizados para fluxos críticos: venda, cancelamento, caixa e cadastro rápido.

## Observação importante

A refatoração foi feita de forma conservadora. O backend principal não foi reescrito para evitar risco de quebrar funcionalidades que já estavam funcionando.
