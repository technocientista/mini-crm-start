import sqlite3

DATABASE = "crm_start.db"


def coluna_cliente_obrigatoria(cursor):
    cursor.execute("PRAGMA table_info(vendas)")
    colunas = cursor.fetchall()

    for coluna in colunas:
        nome = coluna[1]
        notnull = coluna[3]

        if nome == "cliente_id":
            return notnull == 1

    return False


def gerar_definicao_coluna(coluna):
    nome = coluna[1]
    tipo = coluna[2] or "TEXT"
    notnull = coluna[3]
    valor_default = coluna[4]
    pk = coluna[5]

    if pk:
        if nome == "id":
            return "id INTEGER PRIMARY KEY AUTOINCREMENT"
        return f"{nome} {tipo} PRIMARY KEY"

    partes = [nome, tipo]

    if nome != "cliente_id" and notnull:
        partes.append("NOT NULL")

    if valor_default is not None:
        partes.append(f"DEFAULT {valor_default}")

    return " ".join(partes)


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    if not coluna_cliente_obrigatoria(cursor):
        print("A coluna vendas.cliente_id já permite venda sem cliente.")
        conn.close()
        return

    print("Ajustando tabela vendas para permitir cliente_id vazio...")

    cursor.execute("PRAGMA foreign_keys=OFF")

    cursor.execute("PRAGMA table_info(vendas)")
    colunas = cursor.fetchall()

    definicoes = [gerar_definicao_coluna(coluna) for coluna in colunas]
    nomes_colunas = [coluna[1] for coluna in colunas]

    cursor.execute(f"""
        CREATE TABLE vendas_nova (
            {", ".join(definicoes)}
        )
    """)

    colunas_sql = ", ".join(nomes_colunas)

    cursor.execute(f"""
        INSERT INTO vendas_nova ({colunas_sql})
        SELECT {colunas_sql}
        FROM vendas
    """)

    cursor.execute("DROP TABLE vendas")
    cursor.execute("ALTER TABLE vendas_nova RENAME TO vendas")

    cursor.execute("PRAGMA foreign_keys=ON")

    conn.commit()
    conn.close()

    print("Migração concluída. Agora vendas podem ser feitas sem cliente.")


if __name__ == "__main__":
    migrar()