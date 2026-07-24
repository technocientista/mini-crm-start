import sqlite3
from werkzeug.security import generate_password_hash

DATABASE = "crm_start.db"


def criar_banco():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            ativo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT NOT NULL,
            endereco_completo TEXT,
            observacoes TEXT,
            ativo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cliente_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria TEXT NOT NULL,
            marca TEXT,
            sku TEXT UNIQUE,
            preco_custo REAL NOT NULL DEFAULT 0,
            preco_venda REAL NOT NULL DEFAULT 0,
            estoque_atual INTEGER NOT NULL DEFAULT 0,
            estoque_minimo INTEGER NOT NULL DEFAULT 0,
            ativo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            data_venda TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            vendedor TEXT,
            forma_pagamento TEXT NOT NULL,
            desconto_total REAL NOT NULL DEFAULT 0,
            valor_total REAL NOT NULL DEFAULT 0,
            custo_total REAL NOT NULL DEFAULT 0,
            lucro_total REAL NOT NULL DEFAULT 0,
            observacoes TEXT,
            status TEXT NOT NULL DEFAULT 'CONCLUIDA',
            token_operacao TEXT,
            condicao_pagamento TEXT NOT NULL DEFAULT 'A_VISTA',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS venda_itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade INTEGER NOT NULL,
            preco_unitario REAL NOT NULL,
            preco_custo_unitario REAL NOT NULL,
            desconto REAL NOT NULL DEFAULT 0,
            subtotal REAL NOT NULL,
            lucro_item REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_id) REFERENCES vendas(id),
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS venda_pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER NOT NULL,
            forma_pagamento TEXT NOT NULL,
            valor REAL NOT NULL DEFAULT 0,
            valor_recebido REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_id) REFERENCES vendas(id)
        )
    """)

    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vendas_token_operacao
        ON vendas (token_operacao)
        WHERE token_operacao IS NOT NULL
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contas_receber (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER UNIQUE,
            cliente_id INTEGER NOT NULL,
            valor_original_centavos INTEGER NOT NULL,
            saldo_centavos INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'ABERTA',
            origem TEXT NOT NULL DEFAULT 'VENDA',
            descricao TEXT,
            data_referencia TEXT,
            data_vencimento TEXT,
            data_quitacao TEXT,
            observacoes TEXT,
            criado_por_id INTEGER,
            criado_por_nome TEXT,
            token_operacao TEXT UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_id) REFERENCES vendas(id),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recebimentos_clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            caixa_id INTEGER NOT NULL,
            usuario_id INTEGER,
            usuario_nome TEXT,
            forma_pagamento TEXT NOT NULL,
            valor_centavos INTEGER NOT NULL,
            valor_recebido_centavos INTEGER,
            observacoes TEXT,
            token_operacao TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'CONFIRMADO',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            estornado_at TEXT,
            estornado_por_id INTEGER,
            estornado_por_nome TEXT,
            motivo_estorno TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (caixa_id) REFERENCES caixas(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recebimento_alocacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recebimento_id INTEGER NOT NULL,
            conta_receber_id INTEGER NOT NULL,
            valor_centavos INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recebimento_id) REFERENCES recebimentos_clientes(id),
            FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id),
            UNIQUE (recebimento_id, conta_receber_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            estoque_anterior INTEGER NOT NULL,
            estoque_atual INTEGER NOT NULL,
            referencia_venda_id INTEGER,
            observacoes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (referencia_venda_id) REFERENCES vendas(id)
        )
    """)

    senha_hash = generate_password_hash("123456")

    cursor.execute("""
        INSERT OR IGNORE INTO usuarios (nome, email, senha_hash)
        VALUES (?, ?, ?)
    """, ("Administrador", "admin@start.com", senha_hash))

    conn.commit()
    conn.close()

    print("Banco de dados criado com sucesso.")
    print("Usuário inicial: admin@start.com")
    print("Senha inicial: 123456")


if __name__ == "__main__":
    criar_banco()
