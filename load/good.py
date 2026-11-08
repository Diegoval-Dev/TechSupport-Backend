#!/usr/bin/env python3
"""
Simulated user for TechSupport-Backend
(https://github.com/Diegoval-Dev/TechSupport-Backend)

Every invocation performs ONE action against the API. Actions are taken from a
shuffled queue that is persisted in a state file, so calling the script several
times in a row walks through different endpoints before any one repeats.
The state file also remembers tokens and the tickets this "user" created.

Environment variables
---------------------
HOST             Server base URL, e.g. http://localhost:3000   (default: http://localhost:3000)
FAIL_RATE        Chance (0-1) that a "login" action uses a wrong password (default: 0.3)
CLIENT_IDS       Comma-separated UUIDs of clients that EXIST in the database. Optional: if unset,
                 valid clientIds are discovered from tickets already returned by GET /api/tickets.
SKIP_SEED        Set to 1 to never touch the database (no automatic client seeding)
DATABASE_URL     Postgres URL used by seed_clients.py (see that file)
CREATE_FAIL_RATE Chance (0-1) that create_ticket deliberately uses a non-existent clientId
                 (the server answers with an error). Default: 0.25
STATE_FILE       Where state is kept (default: ~/.techsupport_user_sim.json)

Usage
-----
    HOST=http://localhost:3000 python techsupport_user_sim.py
    python techsupport_user_sim.py --action create_ticket   # force a specific action
    python techsupport_user_sim.py --list                   # list available actions
    python techsupport_user_sim.py --reset                  # wipe saved state

Requires: pip install requests
"""

import argparse
import json
import os
import random
import sys
import time
import uuid
from pathlib import Path

import requests

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
HOST = os.environ.get("HOST", "http://localhost:3000").rstrip("/")
if not HOST.startswith(("http://", "https://")):
    HOST = "http://" + HOST

EMAIL = os.environ.get("USER_EMAIL", "admin@techsupport.pro")
PASSWORD = os.environ.get("USER_PASSWORD", "admin123")
FAIL_RATE = float(os.environ.get("FAIL_RATE", "0.3"))
CREATE_FAIL_RATE = float(os.environ.get("CREATE_FAIL_RATE", "0.25"))
ENV_CLIENT_IDS = [
    c.strip() for c in os.environ.get("CLIENT_IDS", "").split(",") if c.strip()
]
STATE_FILE = Path(
    os.environ.get("STATE_FILE", Path.home() / ".techsupport_user_sim.json")
)
TIMEOUT = 15

STATUS_FLOW = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]

TITLES = [
    "Cannot access dashboard",
    "Password reset email never arrives",
    "VPN disconnects every few minutes",
    "Printer on floor 3 is offline",
    "Application crashes on startup",
    "Slow response times on the reports page",
    "Unable to upload attachments",
    "Two-factor code not accepted",
    "Email client keeps asking for credentials",
    "Laptop battery drains in under an hour",
]
DESCRIPTIONS = [
    "Getting a timeout error right after submitting the login form.",
    "Started happening this morning and affects several people on my team.",
    "Tried restarting and clearing the cache, the problem persists.",
    "Error message says 'unexpected failure', no further details shown.",
    "Issue is intermittent but has been getting worse during the week.",
]


# --------------------------------------------------------------------------- #
# State handling
# --------------------------------------------------------------------------- #
def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_state(state: dict) -> None:
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2))
    except OSError as exc:
        print(f"[warn] could not save state: {exc}", file=sys.stderr)


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #
def call(
    method: str,
    path: str,
    *,
    token: str | None = None,
    json_body=None,
    params=None,
    label: str = "",
) -> requests.Response | None:
    url = f"{HOST}{path}"
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    start = time.time()
    try:
        resp = requests.request(
            method, url, headers=headers, json=json_body, params=params, timeout=TIMEOUT
        )
    except requests.RequestException as exc:
        print(f"[{method}] {path} -> CONNECTION ERROR: {exc}")
        return None
    ms = (time.time() - start) * 1000
    snippet = resp.text.strip().replace("\n", " ")[:180]
    tag = f" ({label})" if label else ""
    print(f"[{method}] {path}{tag} -> {resp.status_code} in {ms:.0f}ms  {snippet}")
    return resp


def safe_json(resp: requests.Response | None):
    if resp is None:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


def extract_list(data) -> list:
    """Tickets might come back as a bare list or wrapped in an object."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "items", "tickets", "results"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def harvest_client_ids(state: dict, items: list) -> None:
    """Remember clientIds seen on existing tickets: they are guaranteed to exist in the DB."""
    known = state.setdefault("client_ids", [])
    for item in items:
        cid = item.get("clientId") if isinstance(item, dict) else None
        if cid and cid not in known:
            known.append(cid)
    state["client_ids"] = known[-50:]


def pick_valid_client_id(state: dict) -> str | None:
    """A clientId that should exist: from CLIENT_IDS, else discovered from the API."""
    if ENV_CLIENT_IDS:
        return random.choice(ENV_CLIENT_IDS)
    if not state.get("client_ids"):
        print("(no known client ids, discovering them from existing tickets)")
        resp = authed(
            state,
            "GET",
            "/api/tickets",
            params={"page": 1, "pageSize": 100},
            label="discover clientIds",
        )
        harvest_client_ids(state, extract_list(safe_json(resp)))
    ids = state.get("client_ids") or []
    return random.choice(ids) if ids else None


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
def do_login(state: dict, email: str, password: str, label: str) -> bool:
    resp = call(
        "POST",
        "/api/auth/login",
        json_body={"email": email, "password": password},
        label=label,
    )
    data = safe_json(resp)
    if (
        resp is not None
        and resp.status_code == 200
        and isinstance(data, dict)
        and data.get("accessToken")
    ):
        state["access_token"] = data["accessToken"]
        state["refresh_token"] = data.get("refreshToken")
        return True
    return False


def ensure_auth(state: dict) -> bool:
    if state.get("access_token"):
        return True
    print("(not logged in yet, logging in first)")
    return do_login(state, EMAIL, PASSWORD, "implicit login")


def authed(state: dict, method: str, path: str, **kw) -> requests.Response | None:
    """Authenticated request with one transparent refresh/re-login on 401."""
    if not ensure_auth(state):
        print("Could not authenticate; aborting this action.")
        return None
    resp = call(method, path, token=state["access_token"], **kw)
    if resp is not None and resp.status_code == 401:
        print("(token rejected, trying refresh)")
        if not refresh(state) and not do_login(state, EMAIL, PASSWORD, "re-login"):
            return resp
        resp = call(method, path, token=state["access_token"], **kw)
    return resp


def refresh(state: dict) -> bool:
    if not state.get("refresh_token"):
        return False
    resp = call(
        "POST",
        "/api/auth/refresh",
        token=state.get("access_token"),
        json_body={"refreshToken": state["refresh_token"]},
        label="refresh",
    )
    data = safe_json(resp)
    if (
        resp is not None
        and resp.status_code == 200
        and isinstance(data, dict)
        and data.get("accessToken")
    ):
        state["access_token"] = data["accessToken"]
        state["refresh_token"] = data.get("refreshToken", state["refresh_token"])
        return True
    return False


# --------------------------------------------------------------------------- #
# Actions (each one is one "thing a user might do")
# --------------------------------------------------------------------------- #
def act_health(state):
    call("GET", "/health")


def act_login(state):
    """Sometimes fails with a wrong password, otherwise logs in successfully."""
    if random.random() < FAIL_RATE:
        bad = random.choice(["wrong-password", "123456", "letmein", PASSWORD + "x"])
        do_login({}, EMAIL, bad, "BAD password, expecting 401")
    else:
        do_login(state, EMAIL, PASSWORD, "valid credentials")


def act_login_unknown_user(state):
    ghost = f"ghost_{uuid.uuid4().hex[:6]}@example.com"
    do_login({}, ghost, "whatever123", "unknown user, expecting 401")


def act_unauthorized_access(state):
    call("GET", "/api/tickets", label="no token, expecting 401")


def act_invalid_token(state):
    call(
        "GET",
        "/api/tickets",
        token="not.a.real.token",
        label="garbage token, expecting 401",
    )


def act_refresh(state):
    if not ensure_auth(state):
        return
    refresh(state)


def act_create_ticket(state):
    """Usually uses a clientId that exists (ticket gets created); sometimes uses a
    made-up one on purpose, which the server rejects (FK violation)."""
    state.pop("client_id", None)  # old versions stored a random, invalid id here
    valid = None if random.random() < CREATE_FAIL_RATE else pick_valid_client_id(state)
    if valid:
        client_id, label = valid, "existing clientId, expecting 201"
    else:
        client_id, label = (
            str(uuid.uuid4()),
            "NON-EXISTENT clientId, expecting an error",
        )
        if not ENV_CLIENT_IDS and not state.get("client_ids"):
            label += " (no valid clientId known; set CLIENT_IDS)"
    body = {
        "title": random.choice(TITLES),
        "description": random.choice(DESCRIPTIONS),
        "clientId": client_id,
    }
    resp = authed(state, "POST", "/api/tickets", json_body=body, label=label)
    data = safe_json(resp)
    if resp is not None and resp.status_code in (200, 201) and isinstance(data, dict):
        ticket = data.get("ticket") if isinstance(data.get("ticket"), dict) else data
        if ticket.get("id"):
            state.setdefault("tickets", []).append(
                {
                    "id": ticket["id"],
                    "title": body["title"],
                    "status": ticket.get("status", "OPEN"),
                    "clientId": client_id,
                }
            )
            state["tickets"] = state["tickets"][-25:]
            print(f"-> tracking ticket {ticket['id']}")


def act_create_invalid_ticket(state):
    """Validation failure: bad clientId and empty title -> expecting 400."""
    authed(
        state,
        "POST",
        "/api/tickets",
        json_body={"title": "", "description": "x", "clientId": "not-a-uuid"},
        label="invalid payload, expecting 400",
    )


def act_list_tickets(state):
    params = {"page": 1, "pageSize": random.choice([5, 10, 20])}
    if random.random() < 0.5:
        params["status"] = random.choice(
            ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ESCALATED"]
        )
    resp = authed(state, "GET", "/api/tickets", params=params, label="list/filter")
    harvest_client_ids(state, extract_list(safe_json(resp)))


def act_check_ticket_status(state):
    """'Asks for the status' of one of its tickets (there is no GET /tickets/:id)."""
    tickets = state.get("tickets") or []
    if not tickets:
        print("No tracked tickets yet, creating one first.")
        act_create_ticket(state)
        tickets = state.get("tickets") or []
        if not tickets:
            return
    mine = random.choice(tickets)
    params = {"pageSize": 100}
    if mine.get("clientId"):
        params["clientId"] = mine["clientId"]
    resp = authed(
        state, "GET", "/api/tickets", params=params, label=f"status of {mine['id'][:8]}"
    )
    found = next(
        (t for t in extract_list(safe_json(resp)) if t.get("id") == mine["id"]), None
    )
    if found:
        mine["status"] = found.get("status", mine["status"])
        print(
            f"-> ticket {mine['id'][:8]} '{mine['title']}' is currently {mine['status']}"
        )
    else:
        print(f"-> ticket {mine['id'][:8]} not in results (maybe deleted)")


def act_update_status(state):
    tickets = [t for t in state.get("tickets", []) if t.get("status") != "CLOSED"]
    if not tickets:
        print("No open tracked tickets, creating one first.")
        act_create_ticket(state)
        tickets = [t for t in state.get("tickets", []) if t.get("status") != "CLOSED"]
        if not tickets:
            return
    t = random.choice(tickets)
    idx = STATUS_FLOW.index(t["status"]) if t["status"] in STATUS_FLOW else 0
    # mostly valid forward transitions, occasionally an invalid one
    if random.random() < 0.2:
        target = "OPEN" if t["status"] != "OPEN" else "CLOSED"
        label = "possibly illegal transition"
    else:
        target = STATUS_FLOW[min(idx + 1, len(STATUS_FLOW) - 1)]
        label = "forward transition"
    resp = authed(
        state,
        "PATCH",
        f"/api/tickets/{t['id']}/status",
        json_body={"status": target},
        label=label,
    )
    if resp is not None and resp.status_code == 200:
        t["status"] = target


def act_update_status_bad_uuid(state):
    authed(
        state,
        "PATCH",
        "/api/tickets/not-a-uuid/status",
        json_body={"status": "IN_PROGRESS"},
        label="malformed id, expecting 400",
    )


def act_update_status_missing(state):
    authed(
        state,
        "PATCH",
        f"/api/tickets/{uuid.uuid4()}/status",
        json_body={"status": "IN_PROGRESS"},
        label="random id, expecting 404",
    )


def act_register_agent(state):
    """Admin-only endpoint; creates a throwaway agent and remembers its id."""
    email = f"agent_{uuid.uuid4().hex[:8]}@techsupport.pro"
    resp = authed(
        state,
        "POST",
        "/api/auth/register",
        json_body={
            "email": email,
            "password": "Passw0rd!23",
            "name": "Sim Agent",
            "role": "AGENTE",
        },
    )
    data = safe_json(resp)
    if resp is not None and resp.status_code in (200, 201) and isinstance(data, dict):
        user = data.get("user") if isinstance(data.get("user"), dict) else data
        if user.get("id"):
            state["agent_id"] = user["id"]


def act_assign_ticket(state):
    tickets = state.get("tickets") or []
    if not tickets:
        print("No tracked tickets yet, creating one first.")
        act_create_ticket(state)
        tickets = state.get("tickets") or []
        if not tickets:
            return
    t = random.choice(tickets)
    agent_id = state.get("agent_id") or str(uuid.uuid4())
    authed(
        state,
        "PATCH",
        f"/api/tickets/{t['id']}/assign",
        json_body={"agentId": agent_id},
        label="assign agent",
    )


def act_delete_ticket(state):
    tickets = state.get("tickets") or []
    if not tickets:
        print("No tracked tickets to delete.")
        return
    t = tickets.pop(random.randrange(len(tickets)))
    resp = authed(state, "DELETE", f"/api/tickets/{t['id']}", label="soft delete")
    if resp is not None and resp.status_code not in (200, 204):
        tickets.append(t)  # keep tracking it if the delete didn't work


def act_report(state):
    path = random.choice(
        [
            "/api/reports/avg-resolution",
            "/api/reports/escalated-per-month",
            "/api/reports/top-agents",
            "/api/reports/weekly-status",
            "/api/reports/last-processes",
        ]
    )
    authed(state, "GET", path)


def act_queue_stats(state):
    authed(state, "GET", random.choice(["/api/queue/stats", "/api/queue/dlq"]))


def act_metrics(state):
    call("GET", random.choice(["/metrics", "/health/metrics"]))


def act_logout(state):
    if not state.get("refresh_token"):
        print("Not logged in, nothing to log out.")
        return
    resp = call(
        "POST",
        "/api/auth/logout",
        token=state.get("access_token"),
        json_body={"refreshToken": state["refresh_token"]},
    )
    if resp is not None and resp.status_code in (200, 204):
        state.pop("access_token", None)
        state.pop("refresh_token", None)


ACTIONS = {
    "health": act_health,
    "login": act_login,
    "login_unknown_user": act_login_unknown_user,
    "unauthorized_access": act_unauthorized_access,
    "invalid_token": act_invalid_token,
    "refresh_token": act_refresh,
    "create_ticket": act_create_ticket,
    "create_invalid_ticket": act_create_invalid_ticket,
    "list_tickets": act_list_tickets,
    "check_ticket_status": act_check_ticket_status,
    "update_status": act_update_status,
    "update_status_bad_uuid": act_update_status_bad_uuid,
    "update_status_missing": act_update_status_missing,
    "register_agent": act_register_agent,
    "assign_ticket": act_assign_ticket,
    "delete_ticket": act_delete_ticket,
    "report": act_report,
    "queue_stats": act_queue_stats,
    "metrics": act_metrics,
    "logout": act_logout,
}

# Weights make "happy path" actions more likely to show up than error cases,
# but every action still appears once per shuffled cycle.
EXTRA_WEIGHT = {
    "login": 1,
    "create_ticket": 2,
    "list_tickets": 1,
    "check_ticket_status": 1,
    "update_status": 1,
}


def next_action(state: dict) -> str:
    """Pop the next action from a persisted, shuffled queue (no immediate repeats)."""
    queue = state.get("queue") or []
    if not queue:
        queue = list(ACTIONS) + [a for a, n in EXTRA_WEIGHT.items() for _ in range(n)]
        random.shuffle(queue)
        # never start a new cycle with the action we just ran
        last = state.get("last_action")
        if queue and queue[0] == last:
            queue.append(queue.pop(0))
    action = queue.pop(0)
    state["queue"] = queue
    state["last_action"] = action
    return action


# --------------------------------------------------------------------------- #
# One-time client seeding
# --------------------------------------------------------------------------- #
def ensure_clients_once(state: dict) -> None:
    """Before the first simulated action: if the DB has no clients, insert 5 random
    ones (seed_clients.py). Afterwards the check is remembered in the state file,
    so later runs don't touch the database. --reset re-enables the check."""
    if state.get("clients_ready") or os.environ.get("SKIP_SEED") == "1":
        return
    try:
        import seed_clients
    except ImportError:
        print("[seed] seed_clients.py not found next to this script; skipping seeding.")
        return
    ids = seed_clients.ensure_clients()
    if ids is None:
        print("[seed] could not verify/seed clients; continuing (will retry next run).")
        return
    known = state.setdefault("client_ids", [])
    state["client_ids"] = (known + [i for i in ids if i not in known])[-50:]
    state["clients_ready"] = True


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Simulated user for TechSupport-Backend"
    )
    parser.add_argument(
        "--action", choices=sorted(ACTIONS), help="force a specific action"
    )
    parser.add_argument(
        "--list", action="store_true", help="list available actions and exit"
    )
    parser.add_argument(
        "--reset", action="store_true", help="delete saved state and exit"
    )
    args = parser.parse_args()

    if args.list:
        print("\n".join(sorted(ACTIONS)))
        return 0
    if args.reset:
        STATE_FILE.unlink(missing_ok=True)
        print(f"State reset ({STATE_FILE})")
        return 0

    state = load_state()
    try:
        ensure_clients_once(state)
    except Exception as exc:  # noqa: BLE001  never let seeding break the simulation
        print(f"[seed] unexpected error: {exc}")
    action = args.action or next_action(state)
    state["last_action"] = action
    print(f"=== {HOST} | action: {action} ===")
    try:
        ACTIONS[action](state)
    finally:
        save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
