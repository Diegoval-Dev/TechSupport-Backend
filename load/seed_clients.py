#!/usr/bin/env python3
"""
Inserts 5 random clients into the TechSupport-Backend PostgreSQL database,
but ONLY if the client table is currently empty.

The backend's Prisma schema is not assumed: the script looks the client table up
in information_schema, reads its columns/types/enums, and generates a random
value for every column that has no database-side default. Columns that have a
DB default (autoincrement, now(), ...) are left for Postgres to fill in.

Environment variables
---------------------
DATABASE_URL   Postgres connection string
               (default: postgresql://techsupport:techsupport@localhost:5432/techsupport)
               Use "localhost", not "postgres", when running outside Docker.
CLIENT_TABLE   Table name, if it is not called Client/Clients (case-insensitive)
SEED_COUNT     How many clients to insert when empty (default: 5)

Usage
-----
    python seed_clients.py            # seed if empty, then print client ids
    python seed_clients.py --dry-run  # show what would be inserted

Also importable: seed_clients.ensure_clients() -> list[str] | None

Requires: pip install psycopg2-binary
"""

import argparse
import datetime as dt
import json
import os
import random
import sys
import uuid

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://techsupport:techsupport@localhost:5432/techsupport"
)
CLIENT_TABLE = os.environ.get("CLIENT_TABLE")
SEED_COUNT = int(os.environ.get("SEED_COUNT", "5"))

COMPANIES = [
    "Acme Logistics",
    "Globex Retail",
    "Initech Systems",
    "Umbrella Health",
    "Stark Analytics",
    "Wayne Freight",
    "Hooli Cloud",
    "Soylent Foods",
    "Cyberdyne Labs",
    "Vandelay Imports",
    "Tyrell Robotics",
    "Wonka Candy",
]
FIRST = [
    "Ana",
    "Luis",
    "María",
    "Carlos",
    "Sofía",
    "Diego",
    "Lucía",
    "Mateo",
    "Elena",
    "Pablo",
]
LAST = [
    "García",
    "López",
    "Martínez",
    "Hernández",
    "Pérez",
    "Ramírez",
    "Torres",
    "Flores",
    "Morales",
    "Castillo",
]
STREETS = [
    "Avenida Reforma",
    "6a Avenida",
    "Calzada Roosevelt",
    "Boulevard Los Próceres",
    "12 Calle",
]


def _ascii(s: str) -> str:
    return (
        s.lower()
        .replace(" ", ".")
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ñ", "n")
    )


def gen_value(col: dict, index: int, enum_labels: dict):
    """Random value for one column, based on its name and type."""
    name = col["column_name"].lower()
    dtype = col["data_type"]
    udt = col["udt_name"]

    if dtype == "uuid":
        return str(uuid.uuid4())[:8]
    if dtype == "USER-DEFINED":
        labels = enum_labels.get(udt) or []
        # cycle through labels so every tier (e.g. VIP / NORMAL) shows up
        return labels[index % len(labels)] if labels else None
    if dtype in ("text", "character varying", "character"):
        company = random.choice(COMPANIES)
        person = f"{random.choice(FIRST)} {random.choice(LAST)}"
        suffix = uuid.uuid4().hex[:4]
        if "email" in name or "mail" in name:
            return f"{_ascii(person)}.{suffix}@{_ascii(company).replace('.', '')}.com"
        if "phone" in name or "tel" in name or "mobile" in name:
            return f"+502 {random.randint(4000, 5999)}-{random.randint(1000, 9999)}"
        if "address" in name or "direccion" in name:
            return f"{random.choice(STREETS)} {random.randint(1, 30)}-{random.randint(1, 99)}, Zona {random.randint(1, 16)}"
        if "company" in name or "empresa" in name or "organization" in name:
            return company
        if "contact" in name:
            return person
        if name in ("name", "nombre", "fullname", "full_name", "clientname"):
            return f"{company} {suffix.upper()}"
        if "type" in name or "tier" in name or "plan" in name or "segment" in name:
            return random.choice(["VIP", "NORMAL"])
        return f"{company} {suffix}"
    if dtype in ("integer", "bigint", "smallint"):
        return random.randint(1, 3) if "priority" in name else random.randint(1, 100)
    if dtype in ("numeric", "double precision", "real"):
        return round(random.uniform(1, 100), 2)
    if dtype == "boolean":
        return random.choice([True, False])
    if dtype.startswith("timestamp") or dtype == "date":
        return dt.datetime.utcnow()
    if dtype in ("json", "jsonb"):
        return json.dumps({})
    return None


def ensure_clients(dry_run: bool = False, verbose: bool = True):
    """Insert SEED_COUNT clients if the table is empty. Returns the client ids
    (existing or newly inserted), or None if the DB could not be used."""
    try:
        import psycopg2
        from psycopg2 import sql
        from psycopg2.extras import Json
    except ImportError:
        print(
            "[seed] psycopg2 is missing: pip install psycopg2-binary", file=sys.stderr
        )
        return None

    log = print if verbose else (lambda *a, **k: None)
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
    except Exception as exc:  # noqa: BLE001
        print(
            f"[seed] cannot connect to Postgres ({DATABASE_URL}): {exc}",
            file=sys.stderr,
        )
        print(
            "[seed] set DATABASE_URL (use localhost when running outside Docker)",
            file=sys.stderr,
        )
        return None

    try:
        with conn, conn.cursor() as cur:
            # 1. locate the client table
            if CLIENT_TABLE:
                cur.execute(
                    "SELECT table_schema, table_name FROM information_schema.tables "
                    "WHERE table_name = %s AND table_schema NOT IN ('pg_catalog','information_schema')",
                    (CLIENT_TABLE,),
                )
            else:
                cur.execute(
                    "SELECT table_schema, table_name FROM information_schema.tables "
                    "WHERE lower(table_name) IN ('client','clients') "
                    "AND table_schema NOT IN ('pg_catalog','information_schema')"
                )
            found = cur.fetchone()
            if not found:
                cur.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
                )
                tables = [r[0] for r in cur.fetchall()]
                print(
                    f"[seed] no client table found. Tables in public: {tables}. "
                    "Set CLIENT_TABLE=<name>.",
                    file=sys.stderr,
                )
                return None
            schema, table = found
            tbl = sql.Identifier(schema, table)

            # 2. already seeded?
            cur.execute(sql.SQL("SELECT count(*) FROM {}").format(tbl))
            count = cur.fetchone()[0]
            if count > 0:
                log(
                    f"[seed] {schema}.{table} already has {count} client(s); nothing to insert."
                )
            else:
                # 3. introspect columns
                cur.execute(
                    "SELECT column_name, data_type, udt_name, is_nullable, column_default "
                    "FROM information_schema.columns "
                    "WHERE table_schema=%s AND table_name=%s ORDER BY ordinal_position",
                    (schema, table),
                )
                cols = [
                    dict(
                        zip(
                            (
                                "column_name",
                                "data_type",
                                "udt_name",
                                "is_nullable",
                                "column_default",
                            ),
                            r,
                        )
                    )
                    for r in cur.fetchall()
                ]
                cur.execute(
                    "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid "
                    "ORDER BY t.typname, e.enumsortorder"
                )
                enum_labels: dict = {}
                for typname, label in cur.fetchall():
                    enum_labels.setdefault(typname, []).append(label)

                # columns we must fill: no DB default (Prisma's uuid()/now()/@updatedAt are client-side)
                fill = [c for c in cols if c["column_default"] is None]
                names = [c["column_name"] for c in fill]
                log(f"[seed] table {schema}.{table}: filling columns {names}")

                for i in range(SEED_COUNT):
                    values = []
                    for c in fill:
                        v = gen_value(c, i, enum_labels)
                        if v is None and c["is_nullable"] == "NO":
                            raise RuntimeError(
                                f"don't know how to generate a value for NOT NULL column "
                                f"'{c['column_name']}' ({c['data_type']}/{c['udt_name']})"
                            )
                        values.append(v)
                    log(f"[seed]   client {i + 1}: {dict(zip(names, values))}")
                    if dry_run:
                        continue
                    # enum columns need an explicit cast, with a safely quoted type name
                    placeholders = [
                        sql.SQL("%s::") + sql.Identifier(c["udt_name"])
                        if c["data_type"] == "USER-DEFINED"
                        else sql.Placeholder()
                        for c in fill
                    ]
                    cur.execute(
                        sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                            tbl,
                            sql.SQL(", ").join(sql.Identifier(n) for n in names),
                            sql.SQL(", ").join(placeholders),
                        ),
                        values,
                    )
                if not dry_run:
                    log(f"[seed] inserted {SEED_COUNT} clients.")

            # 4. return ids (so the user simulator can use them)
            cur.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema=%s AND table_name=%s AND column_name='id'",
                (schema, table),
            )
            if not cur.fetchone():
                return []
            cur.execute(sql.SQL("SELECT id::text FROM {} LIMIT 50").format(tbl))
            return [r[0] for r in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001
        print(f"[seed] failed: {exc}", file=sys.stderr)
        return None
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed random clients if none exist")
    parser.add_argument(
        "--dry-run", action="store_true", help="print rows without inserting"
    )
    args = parser.parse_args()
    ids = ensure_clients(dry_run=args.dry_run)
    if ids is None:
        return 1
    print("[seed] client ids:", ", ".join(ids) if ids else "(none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
