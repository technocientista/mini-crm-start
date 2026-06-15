import os
import shutil
import sqlite3
from datetime import datetime


DATABASE = "crm_start.db"


# Tabelas que NÃO serão apagadas
# Ajustei com nomes prováveis para mensagens/modelos de WhatsApp.
# Se sua tabela tiver outro nome, adicione aqui.
TABELAS_MANTER = {
    "sqlite_sequence",
    "modelos_whatsapp",
    "mensagens_whatsapp",
    "whatsapp_mensagens",
    "whatsapp_templates",
    "templates_whatsapp"
}


def criar_backup():
    if not os.path.exists(DATABASE):
        print(f"ERRO: Banco não encontrado: {DATABASE}")
        return None

    pasta_backup = "backups"
    os.makedirs(pasta_backup, exist_ok=True)

    data = datetime.now().strftime("%Y%m%d_%H%M%S")
    arquivo_backup = os.path.join(pasta_backup, f"backup_antes_limpeza_{data}.db")

    shutil.copy2(DATABASE, arquivo_backup)

    print(f"Backup criado em: {arquivo_backup}")
    return arquivo_backup


def listar_tabelas(cursor):
    cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
    """)

    return [row[0] for row in cursor.fetchall()]


def limpar_banco():
    backup = criar_backup()

    if not backup:
        return

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    tabelas = listar_tabelas(cursor)

    print("\nTabelas encontradas:")
    for tabela in tabelas:
        print(f"- {tabela}")

    tabelas_para_apagar = [
        tabela for tabela in tabelas
        if tabela not in TABELAS_MANTER
    ]

    print("\nAs seguintes tabelas terão os registros apagados:")
    for tabela in tabelas_para_apagar:
        print(f"- {tabela}")

    print("\nAs seguintes tabelas serão mantidas:")
    for tabela in tabelas:
        if tabela in TABELAS_MANTER:
            print(f"- {tabela}")

    confirmar = input("\nDigite LIMPAR para confirmar: ")

    if confirmar != "LIMPAR":
        print("Operação cancelada.")
        conn.close()
        return

    cursor.execute("PRAGMA foreign_keys = OFF")

    for tabela in tabelas_para_apagar:
        try:
            cursor.execute(f'DELETE FROM "{tabela}"')
            print(f"Registros apagados da tabela: {tabela}")
        except Exception as erro:
            print(f"Erro ao limpar tabela {tabela}: {erro}")

    # Reinicia os IDs automáticos das tabelas apagadas
    for tabela in tabelas_para_apagar:
        try:
            cursor.execute(
                'DELETE FROM sqlite_sequence WHERE name = ?',
                (tabela,)
            )
        except Exception:
            pass

    cursor.execute("PRAGMA foreign_keys = ON")

    conn.commit()
    conn.close()

    print("\nLimpeza concluída com sucesso.")
    print("As mensagens/modelos de WhatsApp foram preservadas.")
    print(f"Backup disponível em: {backup}")


if __name__ == "__main__":
    limpar_banco()