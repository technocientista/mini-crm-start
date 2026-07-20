import os
import sqlite3


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE = os.path.join(BASE_DIR, "crm_start.db")


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    return coluna in {linha[1] for linha in cursor.fetchall()}


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    if not coluna_existe(cursor, "vendas", "token_operacao"):
        cursor.execute("ALTER TABLE vendas ADD COLUMN token_operacao TEXT")

    if not coluna_existe(cursor, "venda_pagamentos", "valor_recebido"):
        cursor.execute("ALTER TABLE venda_pagamentos ADD COLUMN valor_recebido REAL")

    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vendas_token_operacao
        ON vendas (token_operacao)
        WHERE token_operacao IS NOT NULL
    """)

    conn.commit()
    conn.close()

    print("Migration concluída: integridade e troco das vendas atualizados.")


if __name__ == "__main__":
    migrar()
