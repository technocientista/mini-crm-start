import sqlite3

DATABASE = "crm_start.db"


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs_sistema (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            usuario_nome TEXT,
            acao TEXT NOT NULL,
            entidade TEXT,
            entidade_id INTEGER,
            descricao TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    """)

    conn.commit()
    conn.close()

    print("Tabela logs_sistema criada/atualizada com sucesso.")


if __name__ == "__main__":
    migrar()