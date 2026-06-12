import sqlite3

DATABASE = "crm_start.db"


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = cursor.fetchall()
    return any(c[1] == coluna for c in colunas)


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    if not coluna_existe(cursor, "usuarios", "perfil"):
        cursor.execute("""
            ALTER TABLE usuarios
            ADD COLUMN perfil TEXT NOT NULL DEFAULT 'ADMIN'
        """)
        print("Coluna usuarios.perfil criada.")

    if not coluna_existe(cursor, "usuarios", "comissao_percentual"):
        cursor.execute("""
            ALTER TABLE usuarios
            ADD COLUMN comissao_percentual REAL NOT NULL DEFAULT 0
        """)
        print("Coluna usuarios.comissao_percentual criada.")

    if not coluna_existe(cursor, "vendas", "vendedor_id"):
        cursor.execute("""
            ALTER TABLE vendas
            ADD COLUMN vendedor_id INTEGER
        """)
        print("Coluna vendas.vendedor_id criada.")

    cursor.execute("""
        UPDATE usuarios
        SET perfil = 'ADMIN'
        WHERE perfil IS NULL OR perfil = ''
    """)

    conn.commit()
    conn.close()

    print("Migração concluída com sucesso.")


if __name__ == "__main__":
    migrar()