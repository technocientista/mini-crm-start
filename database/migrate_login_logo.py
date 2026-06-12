import sqlite3

DATABASE = "crm_start.db"


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = cursor.fetchall()
    return any(c[1] == coluna for c in colunas)


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    if not coluna_existe(cursor, "configuracoes_loja", "login_logo_path"):
        cursor.execute("""
            ALTER TABLE configuracoes_loja
            ADD COLUMN login_logo_path TEXT
        """)
        print("Coluna configuracoes_loja.login_logo_path criada.")

    conn.commit()
    conn.close()

    print("Migração concluída com sucesso.")


if __name__ == "__main__":
    migrar()