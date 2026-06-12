import sqlite3

DATABASE = "crm_start.db"


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = cursor.fetchall()
    return any(c[1] == coluna for c in colunas)


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS caixas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_abertura_id INTEGER,
            usuario_abertura_nome TEXT,
            usuario_fechamento_id INTEGER,
            usuario_fechamento_nome TEXT,

            data_abertura TEXT DEFAULT CURRENT_TIMESTAMP,
            data_fechamento TEXT,

            valor_inicial REAL NOT NULL DEFAULT 0,

            total_vendas REAL NOT NULL DEFAULT 0,
            total_dinheiro REAL NOT NULL DEFAULT 0,
            total_pix REAL NOT NULL DEFAULT 0,
            total_cartao REAL NOT NULL DEFAULT 0,
            total_outros REAL NOT NULL DEFAULT 0,

            entradas_manuais REAL NOT NULL DEFAULT 0,
            saidas_manuais REAL NOT NULL DEFAULT 0,

            valor_esperado REAL NOT NULL DEFAULT 0,
            valor_informado REAL NOT NULL DEFAULT 0,
            diferenca REAL NOT NULL DEFAULT 0,

            observacoes_abertura TEXT,
            observacoes_fechamento TEXT,

            status TEXT NOT NULL DEFAULT 'ABERTO'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caixa_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            valor REAL NOT NULL,
            descricao TEXT,
            usuario_id INTEGER,
            usuario_nome TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (caixa_id) REFERENCES caixas(id)
        )
    """)

    if not coluna_existe(cursor, "vendas", "caixa_id"):
        cursor.execute("""
            ALTER TABLE vendas
            ADD COLUMN caixa_id INTEGER
        """)
        print("Coluna vendas.caixa_id criada.")

    conn.commit()
    conn.close()

    print("Migração de caixa concluída com sucesso.")


if __name__ == "__main__":
    migrar()