import os
import sqlite3


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE = os.path.join(BASE_DIR, "crm_start.db")


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    return coluna in {linha[1] for linha in cursor.fetchall()}


def tabela_existe(cursor, tabela):
    cursor.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (tabela,),
    )
    return cursor.fetchone() is not None


def criar_tabela_contas_receber(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contas_receber (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER UNIQUE,
            cliente_id INTEGER NOT NULL,
            valor_original_centavos INTEGER NOT NULL,
            saldo_centavos INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'ABERTA',
            origem TEXT NOT NULL DEFAULT 'VENDA',
            descricao TEXT,
            data_referencia TEXT,
            data_vencimento TEXT,
            data_quitacao TEXT,
            observacoes TEXT,
            criado_por_id INTEGER,
            criado_por_nome TEXT,
            token_operacao TEXT UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_id) REFERENCES vendas(id),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    """)


def criar_tabela_alocacoes(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recebimento_alocacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recebimento_id INTEGER NOT NULL,
            conta_receber_id INTEGER NOT NULL,
            valor_centavos INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recebimento_id) REFERENCES recebimentos_clientes(id),
            FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id),
            UNIQUE (recebimento_id, conta_receber_id)
        )
    """)


def garantir_contas_com_origem(cursor):
    if not tabela_existe(cursor, "contas_receber"):
        criar_tabela_contas_receber(cursor)
        return

    cursor.execute("PRAGMA table_info(contas_receber)")
    colunas = {linha[1]: linha for linha in cursor.fetchall()}
    venda_obrigatoria = bool(colunas.get("venda_id") and colunas["venda_id"][3])
    colunas_novas = {
        "origem",
        "descricao",
        "data_referencia",
        "criado_por_id",
        "criado_por_nome",
        "token_operacao",
    }

    if not venda_obrigatoria and colunas_novas.issubset(colunas):
        return

    possui_alocacoes = tabela_existe(cursor, "recebimento_alocacoes")
    if possui_alocacoes:
        cursor.execute(
            "ALTER TABLE recebimento_alocacoes "
            "RENAME TO recebimento_alocacoes_antes_saldo_anterior"
        )

    cursor.execute(
        "ALTER TABLE contas_receber "
        "RENAME TO contas_receber_antes_saldo_anterior"
    )
    criar_tabela_contas_receber(cursor)

    cursor.execute("""
        INSERT INTO contas_receber (
            id,
            venda_id,
            cliente_id,
            valor_original_centavos,
            saldo_centavos,
            status,
            origem,
            descricao,
            data_referencia,
            data_vencimento,
            data_quitacao,
            observacoes,
            criado_por_id,
            criado_por_nome,
            token_operacao,
            created_at,
            updated_at
        )
        SELECT
            id,
            venda_id,
            cliente_id,
            valor_original_centavos,
            saldo_centavos,
            status,
            'VENDA',
            CASE WHEN venda_id IS NOT NULL THEN 'Venda #' || venda_id ELSE NULL END,
            NULL,
            data_vencimento,
            data_quitacao,
            observacoes,
            NULL,
            NULL,
            NULL,
            created_at,
            updated_at
        FROM contas_receber_antes_saldo_anterior
    """)

    if possui_alocacoes:
        criar_tabela_alocacoes(cursor)
        cursor.execute("""
            INSERT INTO recebimento_alocacoes (
                id,
                recebimento_id,
                conta_receber_id,
                valor_centavos,
                created_at
            )
            SELECT
                id,
                recebimento_id,
                conta_receber_id,
                valor_centavos,
                created_at
            FROM recebimento_alocacoes_antes_saldo_anterior
        """)
        cursor.execute("DROP TABLE recebimento_alocacoes_antes_saldo_anterior")

    cursor.execute("DROP TABLE contas_receber_antes_saldo_anterior")


def migrar(caminho_banco=None):
    conn = sqlite3.connect(caminho_banco or DATABASE)
    cursor = conn.cursor()

    if not coluna_existe(cursor, "vendas", "condicao_pagamento"):
        cursor.execute(
            "ALTER TABLE vendas "
            "ADD COLUMN condicao_pagamento TEXT NOT NULL DEFAULT 'A_VISTA'"
        )

    garantir_contas_com_origem(cursor)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recebimentos_clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            caixa_id INTEGER NOT NULL,
            usuario_id INTEGER,
            usuario_nome TEXT,
            forma_pagamento TEXT NOT NULL,
            valor_centavos INTEGER NOT NULL,
            valor_recebido_centavos INTEGER,
            observacoes TEXT,
            token_operacao TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'CONFIRMADO',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            estornado_at TEXT,
            estornado_por_id INTEGER,
            estornado_por_nome TEXT,
            motivo_estorno TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (caixa_id) REFERENCES caixas(id)
        )
    """)

    criar_tabela_alocacoes(cursor)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente_status
        ON contas_receber (cliente_id, status)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_contas_receber_saldo
        ON contas_receber (saldo_centavos)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_recebimentos_cliente_data
        ON recebimentos_clientes (cliente_id, created_at)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_recebimentos_caixa_status
        ON recebimentos_clientes (caixa_id, status)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_recebimento_alocacoes_conta
        ON recebimento_alocacoes (conta_receber_id)
    """)

    if tabela_existe(cursor, "caixas") and not coluna_existe(
        cursor, "caixas", "total_recebimentos_crediario"
    ):
        cursor.execute(
            "ALTER TABLE caixas "
            "ADD COLUMN total_recebimentos_crediario REAL NOT NULL DEFAULT 0"
        )

    conn.commit()
    conn.close()
    print("Migration concluída: crediário e contas a receber atualizados.")


if __name__ == "__main__":
    migrar()
