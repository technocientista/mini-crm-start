"""Validação integrada e não destrutiva do fluxo de crediário.

Executa as operações em uma cópia temporária do banco local.
"""

import os
import json
import shutil
import sqlite3
import sys
import tempfile


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import app as crm  # noqa: E402
from database.migrate_crediario import migrar  # noqa: E402


def validar():
    banco_original = crm.DATABASE

    with tempfile.TemporaryDirectory() as diretorio:
        banco_teste = os.path.join(diretorio, "crm_start_teste.db")
        shutil.copy2(banco_original, banco_teste)
        migrar(banco_teste)
        migrar(banco_teste)
        crm.DATABASE = banco_teste

        conn = sqlite3.connect(banco_teste)
        conn.row_factory = sqlite3.Row
        admin = conn.execute("""
            SELECT id, nome, perfil
            FROM usuarios
            WHERE ativo = 1 AND perfil = 'ADMIN'
            ORDER BY id
            LIMIT 1
        """).fetchone()
        assert admin, "É necessário um administrador ativo para a validação."

        conn.execute("UPDATE caixas SET status = 'FECHADO' WHERE status = 'ABERTO'")
        cursor = conn.execute("""
            INSERT INTO clientes (nome, telefone, ativo)
            VALUES ('Cliente Teste Crediário', '88999999999', 1)
        """)
        cliente_id = cursor.lastrowid
        cursor = conn.execute("""
            INSERT INTO caixas (
                usuario_abertura_id,
                usuario_abertura_nome,
                valor_inicial,
                status
            ) VALUES (?, ?, 50, 'ABERTO')
        """, (admin["id"], admin["nome"]))
        caixa_id = cursor.lastrowid
        cursor = conn.execute("""
            INSERT INTO vendas (
                cliente_id,
                vendedor,
                forma_pagamento,
                valor_total,
                custo_total,
                lucro_total,
                status,
                caixa_id,
                token_operacao,
                condicao_pagamento
            ) VALUES (?, ?, 'CREDIARIO', 100, 60, 40, 'CONCLUIDA', ?, ?, 'CREDIARIO')
        """, (cliente_id, admin["nome"], caixa_id, "teste-crediario-integrado"))
        venda_id = cursor.lastrowid
        conn.execute("""
            INSERT INTO contas_receber (
                venda_id,
                cliente_id,
                valor_original_centavos,
                saldo_centavos,
                status
            ) VALUES (?, ?, 10000, 10000, 'ABERTA')
        """, (venda_id, cliente_id))
        conn.commit()
        conn.close()

        client = crm.app.test_client()
        csrf = "csrf-teste-crediario"
        with client.session_transaction() as sessao:
            sessao["usuario_id"] = admin["id"]
            sessao["usuario_nome"] = admin["nome"]
            sessao["usuario_perfil"] = admin["perfil"]
            sessao["_csrf_token"] = csrf

        for rota in (
            "/contas-receber",
            f"/contas-receber/clientes/{cliente_id}",
            f"/vendas/{venda_id}",
            f"/caixa/{caixa_id}",
            "/relatorios/caixas",
        ):
            resposta = client.get(rota)
            assert resposta.status_code == 200, (rota, resposta.status_code)

        resposta = client.post(
            f"/contas-receber/clientes/{cliente_id}/receber",
            data={
                "_csrf_token": csrf,
                "token_operacao": "recebimento-teste-integrado",
                "forma_pagamento": "DINHEIRO",
                "valor_pagamento": "35,00",
                "valor_recebido": "50,00",
                "observacoes": "Validação automatizada",
            },
        )
        assert resposta.status_code == 302

        conn = crm.get_db_connection()
        recebimento = conn.execute("""
            SELECT id, status, valor_centavos
            FROM recebimentos_clientes
            WHERE token_operacao = 'recebimento-teste-integrado'
        """).fetchone()
        conta = conn.execute(
            "SELECT saldo_centavos, status FROM contas_receber WHERE venda_id = ?",
            (venda_id,),
        ).fetchone()
        assert recebimento["valor_centavos"] == 3500
        assert conta["saldo_centavos"] == 6500
        assert conta["status"] == "PARCIAL"

        resumo = crm.calcular_resumo_caixa(conn, caixa_id)
        assert resumo["total_vendas"] == 100
        assert resumo["total_recebimentos_crediario"] == 35
        assert resumo["total_dinheiro"] == 35
        assert resumo["valor_esperado"] == 85
        conn.close()

        resposta = client.get(
            f"/contas-receber/recebimentos/{recebimento['id']}/recibo"
        )
        assert resposta.status_code == 200

        resposta = client.post(
            f"/contas-receber/recebimentos/{recebimento['id']}/estornar",
            data={
                "_csrf_token": csrf,
                "motivo_estorno": "Validação automatizada",
            },
        )
        assert resposta.status_code == 302

        conn = crm.get_db_connection()
        recebimento = conn.execute(
            "SELECT status FROM recebimentos_clientes WHERE id = ?",
            (recebimento["id"],),
        ).fetchone()
        conta = conn.execute(
            "SELECT saldo_centavos, status FROM contas_receber WHERE venda_id = ?",
            (venda_id,),
        ).fetchone()
        resumo = crm.calcular_resumo_caixa(conn, caixa_id)
        conn.close()

        assert recebimento["status"] == "ESTORNADO"
        assert conta["saldo_centavos"] == 10000
        assert conta["status"] == "ABERTA"
        assert resumo["total_recebimentos_crediario"] == 0
        assert resumo["total_dinheiro"] == 0
        assert resumo["valor_esperado"] == 50

        conn = crm.get_db_connection()
        vendedor = conn.execute("""
            SELECT id
            FROM usuarios
            WHERE ativo = 1 AND perfil = 'VENDEDOR'
            ORDER BY id
            LIMIT 1
        """).fetchone()
        assert vendedor, "É necessário um vendedor ativo para validar o PDV."
        cursor = conn.execute("""
            INSERT INTO produtos (
                nome,
                categoria,
                marca,
                sku,
                preco_custo,
                preco_venda,
                estoque_atual,
                estoque_minimo,
                ativo
            ) VALUES ('Produto Teste Crediário', 'Teste', 'Start', ?, 40, 80, 10, 1, 1)
        """, ("SKU-CREDIARIO-TESTE",))
        produto_id = cursor.lastrowid
        conn.commit()
        conn.close()

        itens = json.dumps([{"produto_id": produto_id, "quantidade": 1}])
        payload_base = {
            "_csrf_token": csrf,
            "cliente_id": cliente_id,
            "vendedor_id": vendedor["id"],
            "desconto_total": "0,00",
            "observacoes": "Venda validada automaticamente",
            "itens_json": itens,
            "resposta_json": "1",
        }

        resposta = client.post("/vendas", data={
            **payload_base,
            "token_operacao": "venda-crediario-sem-cliente",
            "cliente_id": "",
            "forma_pagamento": "CREDIARIO",
            "pagamento_dividido": "0",
            "venda_crediario": "1",
        })
        assert resposta.status_code == 400
        assert not resposta.get_json()["sucesso"]

        resposta = client.post("/vendas", data={
            **payload_base,
            "token_operacao": "venda-crediario-pura",
            "forma_pagamento": "CREDIARIO",
            "pagamento_dividido": "0",
            "venda_crediario": "1",
        })
        assert resposta.status_code == 200
        venda_pura_id = resposta.get_json()["venda_id"]

        resposta = client.post("/vendas", data={
            **payload_base,
            "token_operacao": "venda-crediario-com-entrada",
            "forma_pagamento": "MULTIPLO",
            "pagamento_dividido": "1",
            "venda_crediario": "1",
            "valor_pix": "25,00",
            "valor_dinheiro": "0,00",
            "valor_cartao": "0,00",
        })
        assert resposta.status_code == 200
        venda_mista_id = resposta.get_json()["venda_id"]

        conn = crm.get_db_connection()
        venda_pura = conn.execute(
            "SELECT condicao_pagamento FROM vendas WHERE id = ?",
            (venda_pura_id,),
        ).fetchone()
        conta_pura = conn.execute(
            "SELECT saldo_centavos FROM contas_receber WHERE venda_id = ?",
            (venda_pura_id,),
        ).fetchone()
        venda_mista = conn.execute(
            "SELECT condicao_pagamento FROM vendas WHERE id = ?",
            (venda_mista_id,),
        ).fetchone()
        conta_mista = conn.execute(
            "SELECT saldo_centavos FROM contas_receber WHERE venda_id = ?",
            (venda_mista_id,),
        ).fetchone()
        entrada_mista = conn.execute(
            "SELECT forma_pagamento, valor FROM venda_pagamentos WHERE venda_id = ?",
            (venda_mista_id,),
        ).fetchone()
        conn.close()

        assert venda_pura["condicao_pagamento"] == "CREDIARIO"
        assert conta_pura["saldo_centavos"] == 8000
        assert venda_mista["condicao_pagamento"] == "MISTO_CREDIARIO"
        assert conta_mista["saldo_centavos"] == 5500
        assert entrada_mista["forma_pagamento"] == "PIX"
        assert entrada_mista["valor"] == 25

        conn = crm.get_db_connection()
        resumo_antes_fechamento = crm.calcular_resumo_caixa(conn, caixa_id)
        conn.close()
        assert resumo_antes_fechamento["total_vendas"] == 260
        assert resumo_antes_fechamento["total_pix"] == 25
        assert resumo_antes_fechamento["valor_esperado"] == 50

        resposta = client.post("/caixa", data={
            "_csrf_token": csrf,
            "acao": "fechar",
            "valor_informado": "50,00",
            "observacoes_fechamento": "Validação automatizada",
        })
        assert resposta.status_code == 302

        conn = crm.get_db_connection()
        caixa_fechado = conn.execute("""
            SELECT
                status,
                total_vendas,
                total_pix,
                total_recebimentos_crediario,
                valor_esperado,
                diferenca
            FROM caixas
            WHERE id = ?
        """, (caixa_id,)).fetchone()
        conn.close()
        assert caixa_fechado["status"] == "FECHADO"
        assert caixa_fechado["total_vendas"] == 260
        assert caixa_fechado["total_pix"] == 25
        assert caixa_fechado["total_recebimentos_crediario"] == 0
        assert caixa_fechado["valor_esperado"] == 50
        assert caixa_fechado["diferenca"] == 0

    crm.DATABASE = banco_original
    print("Validação do crediário concluída com sucesso.")


if __name__ == "__main__":
    validar()
