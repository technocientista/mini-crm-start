import sqlite3

DATABASE = "crm_start.db"


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(f"PRAGMA table_info({tabela})")
    colunas = cursor.fetchall()
    return any(c[1] == coluna for c in colunas)


def migrar():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    if not coluna_existe(cursor, "mensagens_whatsapp", "codigo"):
        cursor.execute("""
            ALTER TABLE mensagens_whatsapp
            ADD COLUMN codigo TEXT
        """)
        print("Coluna mensagens_whatsapp.codigo criada.")

    modelos = [
        (
            "REATIVACAO_CLIENTE",
            "Reativação de cliente",
            "Reativação",
            "Olá, {cliente_nome}! Tudo bem? Aqui é da {loja_nome}. Sentimos sua falta por aqui! Temos novidades e acessórios que podem combinar com você. Quando puder, chama a gente 😊"
        ),
        (
            "CLIENTE_VIP",
            "Cliente VIP",
            "Relacionamento",
            "Olá, {cliente_nome}! Tudo bem? Aqui é da {loja_nome}. Você é um cliente especial para a gente. Temos novidades e condições especiais esperando por você!"
        ),
        (
            "POS_VENDA",
            "Pós-venda recente",
            "Pós-venda",
            "Olá, {cliente_nome}! Tudo bem? Aqui é da {loja_nome}. Obrigado pela sua compra recente! Qualquer dúvida ou necessidade, estamos à disposição."
        ),
        (
            "CLIENTE_SEM_COMPRA",
            "Cliente sem compra",
            "Atendimento",
            "Olá, {cliente_nome}! Tudo bem? Aqui é da {loja_nome}. Vi que você ainda não comprou com a gente. Posso te ajudar a encontrar algum acessório ou produto?"
        ),
        (
            "ATUALIZAR_INTERESSES",
            "Atualizar interesses do cliente",
            "Cadastro",
            "Olá, {cliente_nome}! Tudo bem? Aqui é da {loja_nome}. Passando para atualizar seu cadastro e entender melhor seus interesses. Assim consigo te avisar quando chegar algo que combine com você."
        )
    ]

    for codigo, nome, categoria, mensagem in modelos:
        existente = cursor.execute("""
            SELECT id
            FROM mensagens_whatsapp
            WHERE codigo = ?
            LIMIT 1
        """, (codigo,)).fetchone()

        if existente:
            continue

        cursor.execute("""
            INSERT INTO mensagens_whatsapp (
                codigo,
                nome,
                categoria,
                mensagem,
                ativo
            ) VALUES (?, ?, ?, ?, 1)
        """, (
            codigo,
            nome,
            categoria,
            mensagem
        ))

        print(f"Modelo criado: {codigo}")

    conn.commit()
    conn.close()

    print("Migração concluída com sucesso.")


if __name__ == "__main__":
    migrar()