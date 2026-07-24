import os
import sqlite3


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE = os.path.join(BASE_DIR, "crm_start.db")


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    return coluna in {linha[1] for linha in cursor.fetchall()}


def migrar(caminho_banco=DATABASE):
    conn = sqlite3.connect(caminho_banco, timeout=30)
    cursor = conn.cursor()
    cursor.execute("PRAGMA busy_timeout = 30000")

    if not coluna_existe(
        cursor,
        "configuracoes_loja",
        "aplicar_lucro_minimo"
    ):
        cursor.execute("""
            ALTER TABLE configuracoes_loja
            ADD COLUMN aplicar_lucro_minimo INTEGER NOT NULL DEFAULT 0
        """)

    if not coluna_existe(
        cursor,
        "configuracoes_loja",
        "lucro_minimo_percentual"
    ):
        cursor.execute("""
            ALTER TABLE configuracoes_loja
            ADD COLUMN lucro_minimo_percentual REAL NOT NULL DEFAULT 60
        """)

    cursor.execute("""
        UPDATE configuracoes_loja
        SET aplicar_lucro_minimo = COALESCE(aplicar_lucro_minimo, 0),
            lucro_minimo_percentual = COALESCE(lucro_minimo_percentual, 60)
        WHERE id = 1
    """)

    conn.commit()
    conn.close()

    print("Migração concluída: política de lucro mínimo configurada.")


if __name__ == "__main__":
    migrar()
