import sqlite3

DATABASE = "crm_start.db"


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS configuracoes_loja (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            nome_loja TEXT,
            telefone TEXT,
            endereco TEXT,
            cidade TEXT,
            instagram TEXT,
            mensagem_recibo TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        INSERT OR IGNORE INTO configuracoes_loja (
            id,
            nome_loja,
            telefone,
            endereco,
            cidade,
            instagram,
            mensagem_recibo
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        1,
        "Start Eletrônicos",
        "",
        "",
        "Acopiara-CE",
        "",
        "Obrigado pela preferência!"
    ))

    conn.commit()
    conn.close()

    print("Tabela de configurações criada/atualizada com sucesso.")


if __name__ == "__main__":
    migrar()