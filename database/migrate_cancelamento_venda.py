import sqlite3

DATABASE = "crm_start.db"


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = cursor.fetchall()
    return any(c[1] == coluna for c in colunas)


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    if not coluna_existe(cursor, "vendas", "motivo_cancelamento"):
        cursor.execute("""
            ALTER TABLE vendas
            ADD COLUMN motivo_cancelamento TEXT
        """)
        print("Coluna vendas.motivo_cancelamento criada.")

    if not coluna_existe(cursor, "vendas", "data_cancelamento"):
        cursor.execute("""
            ALTER TABLE vendas
            ADD COLUMN data_cancelamento TEXT
        """)
        print("Coluna vendas.data_cancelamento criada.")

    if not coluna_existe(cursor, "vendas", "cancelado_por"):
        cursor.execute("""
            ALTER TABLE vendas
            ADD COLUMN cancelado_por TEXT
        """)
        print("Coluna vendas.cancelado_por criada.")

    conn.commit()
    conn.close()

    print("Migração concluída com sucesso.")


if __name__ == "__main__":
    migrar()