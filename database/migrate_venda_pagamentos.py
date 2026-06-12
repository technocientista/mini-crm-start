import sqlite3

DATABASE = "crm_start.db"


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = [linha[1] for linha in cursor.fetchall()]
    return coluna in colunas


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS venda_pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER NOT NULL,
            forma_pagamento TEXT NOT NULL,
            valor REAL NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_id) REFERENCES vendas(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_venda_pagamentos_venda_id
        ON venda_pagamentos (venda_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_venda_pagamentos_forma
        ON venda_pagamentos (forma_pagamento)
    """)

    conn.commit()
    conn.close()

    print("Migration concluída: tabela venda_pagamentos criada/verificada com sucesso.")


if __name__ == "__main__":
    migrar()