import sqlite3
from werkzeug.security import generate_password_hash


DATABASE = "crm_start.db"

NOME = "Administrador"
EMAIL = "admin@startcrm.com"
SENHA = "admin123"
PERFIL = "ADMIN"
COMISSAO_PERCENTUAL = 0


def criar_admin():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id
        FROM usuarios
        WHERE email = ?
    """, (EMAIL,))

    usuario_existente = cursor.fetchone()

    senha_hash = generate_password_hash(SENHA)

    if usuario_existente:
        cursor.execute("""
            UPDATE usuarios
            SET nome = ?,
                senha_hash = ?,
                ativo = 1,
                perfil = ?,
                comissao_percentual = ?
            WHERE email = ?
        """, (
            NOME,
            senha_hash,
            PERFIL,
            COMISSAO_PERCENTUAL,
            EMAIL
        ))

        print("Usuário admin já existia e foi atualizado.")

    else:
        cursor.execute("""
            INSERT INTO usuarios (
                nome,
                email,
                senha_hash,
                ativo,
                perfil,
                comissao_percentual
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            NOME,
            EMAIL,
            senha_hash,
            1,
            PERFIL,
            COMISSAO_PERCENTUAL
        ))

        print("Usuário admin criado com sucesso.")

    conn.commit()
    conn.close()

    print("")
    print("Acesso criado:")
    print(f"E-mail: {EMAIL}")
    print(f"Senha: {SENHA}")
    print("")
    print("Depois de entrar no sistema, altere essa senha.")


if __name__ == "__main__":
    criar_admin()