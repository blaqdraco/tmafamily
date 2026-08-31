import os
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

import pg8000.dbapi

PROJECT_REF = "olwinzxpnozjcgzgnhax"


def split_postgres_statements(sql):
    statements = []
    current = []
    i = 0
    quote = None
    dollar_quote = None

    while i < len(sql):
        if dollar_quote:
            if sql.startswith(dollar_quote, i):
                current.append(dollar_quote)
                i += len(dollar_quote)
                dollar_quote = None
                continue
            current.append(sql[i])
            i += 1
            continue

        if quote:
            current.append(sql[i])
            if sql[i] == quote:
                if i + 1 < len(sql) and sql[i + 1] == quote:
                    current.append(sql[i + 1])
                    i += 2
                    continue
                quote = None
            i += 1
            continue

        if sql[i] in {"'", '"'}:
            quote = sql[i]
            current.append(sql[i])
            i += 1
            continue

        if sql[i] == "$":
            end = sql.find("$", i + 1)
            if end != -1:
                tag = sql[i : end + 1]
                if tag == "$$" or tag[1:-1].replace("_", "").isalnum():
                    dollar_quote = tag
                    current.append(tag)
                    i = end + 1
                    continue

        if sql[i] == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            i += 1
            continue

        current.append(sql[i])
        i += 1

    statement = "".join(current).strip()
    if statement:
        statements.append(statement)
    return statements


def connect():
    database_url = os.environ.get("SUPABASE_DB_URL")
    password = os.environ.get("SUPABASE_DB_PASSWORD")

    if database_url:
        parsed = urlparse(database_url)
        host = parsed.hostname
        port = parsed.port or 5432
        database = parsed.path.lstrip("/") or "postgres"
        user = unquote(parsed.username or "postgres")
        password = unquote(parsed.password or password or "")
    else:
        host = f"db.{PROJECT_REF}.supabase.co"
        port = 5432
        database = "postgres"
        user = "postgres"

    if not password:
        raise RuntimeError(
            "Set SUPABASE_DB_PASSWORD (Supabase Dashboard → Project Settings → Database)."
        )

    return pg8000.dbapi.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
        ssl_context=True,
        timeout=60,
    )


def apply_file(cursor, path: Path):
    sql = path.read_text()
    statements = split_postgres_statements(sql)
    print(f"Applying {path} ({len(statements)} statements)...")
    for index, statement in enumerate(statements, start=1):
        cursor.execute(statement)
        print(f"  {path.name}: {index}/{len(statements)}")


def main():
    root = Path(__file__).resolve().parents[1]
    files = sys.argv[1:] or [
        "supabase/workflow-migration.sql",
        "supabase/seed.sql",
    ]
    paths = [(root / file).resolve() for file in files]

    connection = connect()
    try:
        cursor = connection.cursor()
        for path in paths:
            if not path.exists():
                raise FileNotFoundError(path)
            apply_file(cursor, path)
        connection.commit()
        print("Done.")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
