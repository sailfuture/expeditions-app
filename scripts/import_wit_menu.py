"""Import the WIT 7-week galley menu workbook into the Expedition App's Xano backend.

The workbook (one tab per recipe, a 49-day rotation, an order sheet and a protein prep
plan) becomes:
  * 27 cookbook recipes   -> /expedition_cookbook           (+ ingredient rows in
                             /expeditions_recipes, steps in /expedition_recipe_instructions)
  * the 49-day rotation   -> expedition_cookbook_id on the Breakfast / Lunch / Dinner
                             schedule items of each expedition day (/expedition_schedule_items)

Quantities in the workbook are totals for 16 crew in mixed units; the app stores ounces
PER PERSON (oz_per_meal) and multiplies by the day's crew count, so every amount is
converted to ounces and divided by 16. The original 16-crew amount is kept in prep_notes.

Usage (run from the repo root; needs openpyxl and XANO_EXPEDITIONS_APP_KEY in .env.local):

  python scripts/import_wit_menu.py preview "<workbook.xlsx>"
      Writes scripts/wit-menu/preview.json + preview.md. Nothing is written to Xano.

  python scripts/import_wit_menu.py load "<workbook.xlsx>" [--recipes-only | --menu-only]
                                        [--from-date YYYY-MM-DD] [--overwrite] [--expedition 14]
      Creates the recipes (idempotent by recipe name within the expedition) and links the
      menu. Meal slots that already carry a recipe are left alone unless --overwrite.
      Dates before --from-date (default: today) are never touched. Everything created or
      changed is recorded in scripts/wit-menu/load-log.json.

  python scripts/import_wit_menu.py rollback
      Deletes exactly what load-log.json says was created and restores patched meal slots.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "scripts" / "wit-menu"
XANO_BASE = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"
KEY_HEADER = "X-Expeditions-Key"
CREW = 16

MEAL_TYPES = {"B": ("Breakfast", 1, 800, 900), "L": ("Lunch", 2, 1200, 1300), "D": ("Dinner", 3, 1900, 2100)}

# Workbook ingredient -> (app ingredient name, app type). Types follow the vocabulary the
# recipe editor offers: Protein, Starch, Veg, Dairy, Frozen, Dry Goods, Seasoning.
INGREDIENTS: dict[str, tuple[str, str]] = {
    "Chicken leg quarters, bone-in": ("Chicken Leg Quarters", "Protein"),
    "Beef stew meat, boneless": ("Beef Stew Meat", "Protein"),
    "Beef patties, 4 oz (frozen)": ("Hamburger Patties (4 oz)", "Protein"),
    "Chicken sausages": ("Chicken Sausage", "Protein"),
    "Hot dogs, jumbo": ("Hot Dogs (jumbo)", "Protein"),
    "Bacon, streaky": ("Bacon", "Protein"),
    "Eggs": ("Eggs", "Protein"),
    "Cheddar cheese, shredded": ("Cheddar Cheese (shredded)", "Dairy"),
    "American cheese slices": ("American Cheese (sliced)", "Dairy"),
    "Mozzarella cheese": ("Mozzarella Cheese", "Dairy"),
    "Margarine": ("Margarine", "Dairy"),
    "Long-life milk 1 L": ("Milk (long-life)", "Dairy"),
    "Rice, white (dry)": ("Rice", "Starch"),
    "Penne (dry)": ("Penne Pasta", "Starch"),
    "Spaghetti (dry)": ("Spaghetti", "Starch"),
    "Flour tortillas": ("Tortillas", "Starch"),
    "Sandwich bread loaf": ("Sliced Bread", "Starch"),
    "Hamburger buns 8 ct": ("Hamburger Buns", "Starch"),
    "Hot dog buns 8 ct": ("Hot Dog Buns", "Starch"),
    "Pancake mix": ("Pancake Mix", "Starch"),
    "Rolled oats": ("Oats", "Starch"),
    "Instant mashed potatoes 113 g": ("Mashed Potatoes (instant)", "Starch"),
    "Boxed macaroni & cheese 206 g": ("Mac & Cheese (boxed)", "Starch"),
    "Potatoes": ("Potato", "Starch"),
    "All-purpose flour": ("Flour", "Dry Goods"),
    "French fries, frozen": ("French Fries", "Frozen"),
    "Frozen broccoli florets": ("Broccoli (frozen)", "Frozen"),
    "Frozen green peas": ("Green Peas (frozen)", "Frozen"),
    "Frozen mixed vegetables": ("Vegetable Mix (frozen)", "Frozen"),
    "Bell peppers": ("Bell Pepper", "Veg"),
    "Onions, yellow": ("Onion", "Veg"),
    "Carrots": ("Carrot", "Veg"),
    "Green cabbage": ("Cabbage", "Veg"),
    "Apples": ("Apples", "Veg"),
    "Diced tomatoes, canned 411 g": ("Canned Tomatoes (diced)", "Veg"),
    "Whole kernel corn, canned 3 kg": ("Canned Corn", "Veg"),
    "Peas & carrots, canned 425 g": ("Canned Peas & Carrots", "Veg"),
    "Pigeon peas, canned 400 g": ("Pigeon Peas (canned)", "Veg"),
    "Red kidney beans, canned 400 g": ("Kidney Beans (canned)", "Dry Goods"),
    "Ketchup 750 mL": ("Ketchup", "Dry Goods"),
    "Mustard 454 g": ("Mustard", "Dry Goods"),
    "Mayonnaise": ("Mayo", "Dry Goods"),
    "BBQ sauce": ("BBQ Sauce", "Dry Goods"),
    "Pepper sauce 750 mL": ("Hot Sauce (pepper sauce)", "Dry Goods"),
    "Soy sauce": ("Soy Sauce", "Dry Goods"),
    "Pancake syrup 1.89 L": ("Syrup", "Dry Goods"),
    "Grape jelly 850 g": ("Jelly", "Dry Goods"),
    "Peanut butter 1.13 kg": ("Peanut Butter", "Dry Goods"),
    "Pasta sauce 1.28 kg": ("Pasta Sauce", "Dry Goods"),
    "Alfredo sauce 425 g": ("Alfredo Sauce", "Dry Goods"),
    "Sugar, white": ("Sugar", "Dry Goods"),
    "Vegetable (soybean) oil": ("Vegetable Oil", "Dry Goods"),
    "Browning": ("Browning", "Seasoning"),
    "Green seasoning": ("Green Seasoning", "Seasoning"),
    "Minced garlic": ("Minced Garlic", "Seasoning"),
    "Salt": ("Salt", "Seasoning"),
    "Black pepper, ground": ("Ground Black Pepper", "Seasoning"),
    "Cayenne pepper": ("Cayenne", "Seasoning"),
    "Cinnamon, ground": ("Cinnamon", "Seasoning"),
    "Curry powder": ("Curry Powder", "Seasoning"),
    "Garlic, granulated": ("Garlic Powder", "Seasoning"),
    "Onion, granulated": ("Onion Powder", "Seasoning"),
    "Oregano": ("Oregano", "Seasoning"),
    "Paprika": ("Paprika", "Seasoning"),
    "All-purpose seasoning (taco/chili blend)": ("Complete Seasoning", "Seasoning"),
    "Chicken bouillon cubes": ("Chicken Bouillon Cubes", "Seasoning"),
}
SKIP_INGREDIENTS = {"Water"}

# expeditions_ingredient_types rows in Xano (type_name -> id); "Veg" is stored as "Veggie" there.
TYPE_IDS = {"Protein": 1, "Starch": 2, "Veg": 3, "Dry Goods": 4, "Seasoning": 5, "Frozen": 6, "Dairy": 7}

# Weight-unit -> ounces.
UNIT_OZ = {"lb": 16.0, "kg": 35.274, "g": 0.035274, "L": 33.814, "mL": 0.033814}

# Count units (ea, can, bottle, jar, pk, loaf, box, pouch, patties): ounces per ONE unit, from
# the pack sizes on the Order Sheet. Eggs: the workbook counts 2.5 eggs as 4.4 oz.
COUNT_UNIT_OZ: dict[str, float] = {
    "Eggs": 1.76,
    "Chicken bouillon cubes": 0.14,
    "Diced tomatoes, canned 411 g": 14.5,
    "Peas & carrots, canned 425 g": 15.0,
    "Pigeon peas, canned 400 g": 14.1,
    "Red kidney beans, canned 400 g": 14.1,
    "Whole kernel corn, canned 3 kg": 105.8,
    "Ketchup 750 mL": 25.4,
    "Pepper sauce 750 mL": 25.4,
    "Pancake syrup 1.89 L": 63.9,
    "Mustard 454 g": 16.0,
    "Alfredo sauce 425 g": 15.0,
    "Grape jelly 850 g": 30.0,
    "Pasta sauce 1.28 kg": 45.1,
    "Peanut butter 1.13 kg": 39.9,
    "American cheese slices": 32.0,
    "Hamburger buns 8 ct": 17.6,   # 8 buns x 2.2 oz
    "Hot dog buns 8 ct": 12.0,     # 8 buns x 1.5 oz
    "Sandwich bread loaf": 20.8,   # 590 g
    "Beef patties, 4 oz (frozen)": 4.0,
    "Boxed macaroni & cheese 206 g": 7.27,
    "Instant mashed potatoes 113 g": 3.99,
}

# Protein Prep sheet "Product" label for each protein ingredient, to pull in the cut/prep.
PREP_PRODUCT = {
    "Chicken leg quarters, bone-in": "Chicken",
    "Beef stew meat, boneless": "Beef stew meat",
    "Beef patties, 4 oz (frozen)": "Beef patties",
    "Chicken sausages": "Chicken sausage",
}

# Galley equipment name (as in /expedition_galley_equipment) -> pattern matched against a step.
KNIFE_WORK = (r"\b(dice|chop|mince|trim|core)\w*\b|\bcut\b|\bslice (the |\d|[a-z]+ (into|in)\b)|\bsliced [a-z]+\b"
              r"|into (wedges|coins|strips|cubes|pieces|half)|\bshred (the )?cabbage|\bscrub\b")
EQUIPMENT_PATTERNS = {
    "Pot": r"\bpots?\b|dutch oven|stockpot|saucepan|rice cooker|\bboil|\bsimmer|cook ([\d.]+ lb )?(the )?rice",
    "Pan": r"\bpans?\b|skillet",
    "Sautee pan": r"saut[eé]",
    "Lid (for pan/pot)": r"\blids?\b|\bcovered\b|\bcover(,| and| the)",
    "Sheet pan": r"sheet pans?|baking sheet|baking dish|hotel pan|roasting pan|casserole|\btray\b",
    "Bowl": r"\bbowls?\b",
    "Cheese grater": r"\bgrate\b",
    "Cutting board": KNIFE_WORK,
    "Knife": KNIFE_WORK,
    "Spatula": r"\bflip|spatula|scrape",
    "Whisk": r"\bwhisk",
    "Oven": r"\boven\b|\bbake|\broast|\bbroil",
    "Stove": r"simmer|\bboil|saut|\bfry|\bbrown\b|medium(-| )?(low|high|heat)|over medium|over high|over low|burner|stovetop"
             r"|heat (the )?(oil|pan|pot)|per side|cook ([\d.]+ lb )?(the )?rice|scramble",
    "Flat top": r"griddle|flat ?top",
    "Strainer": r"\bdrain|\bstrain|colander|rinse",
    "Tongs": r"\btongs|turn(ing)? (once|halfway)|flip(ping)? (the )?(chicken|patties|sausages|burgers)",
    "Wooden spoon": r"\bstir",
    "Serving spoon": r"\bplate:|\bserve\b|\bportion",
    "Forks": r"\bshred(ded)? (the )?(chicken|beef|meat)|two forks|pull the meat|pull and",
    "Blender": r"\bblend",
}

# The workbook's revision cut leg quarters from 12 oz to 10 oz per person (ingredient tables and
# Order Sheet say 10 lb per meal) but the step text still says 12 lb. Applied to step text; every
# change is listed in the preview.
STEP_TEXT_FIXES = [(r"\b12 lb leg quarters", "10 lb leg quarters")]

CODE_RE = re.compile(r"^([BLD]\d+)\b")
AMOUNT_RE = re.compile(r"^\s*([\d.]+)\s*(lb|kg|g|L|mL|ea|can|bottle|jar|pk|loaf|patties|box|pouch)\b")


def die(msg: str) -> None:
    print("ERROR:", msg, file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------- workbook


def read_workbook(path: str) -> dict:
    wb = openpyxl.load_workbook(path, data_only=True)
    sheets = {ws.title: [[c.value for c in r] for r in ws.iter_rows()] for ws in wb.worksheets}

    # 7-week rotation: rows "Week n | Mon | B1 | ... | L1 | ... | D1 | ..."
    rotation = []
    for r in sheets["7-Week Menu"]:
        if r and isinstance(r[0], str) and r[0].startswith("Week ") and r[1]:
            rotation.append({"week": int(r[0].split()[1]), "day": r[1], "B": r[2], "L": r[4], "D": r[6], "cost": r[8]})
    if len(rotation) != 49:
        die(f"expected 49 rotation rows, found {len(rotation)}")

    # Recipe Index: prep / cook per code.
    index = {}
    for r in sheets["Recipe Index"]:
        if r and isinstance(r[0], str) and CODE_RE.match(r[0]):
            index[r[0]] = {"prep": r[2], "cook": r[3]}

    # Protein Prep & Storage: code -> product -> cut.
    prep: dict[str, dict[str, str]] = {}
    for r in sheets["Protein Prep & Storage"]:
        if not r or not isinstance(r[0], str) or r[1] in (None, "Product") or not r[2]:
            continue
        codes = re.findall(r"\b([BLD]\d+)\b", r[0])
        for code in codes:
            prep.setdefault(code, {})[str(r[1]).strip()] = str(r[2]).strip()

    recipes = {}
    for title, rows in sheets.items():
        m = re.match(r"^([BLD]\d+) ", title)
        if not m:
            continue
        code = m.group(1)
        rec = {"code": code, "tab": title, "title": rows[0][0], "meta": {}, "ingredients": [], "steps": [], "notes": []}
        section = None
        for i, r in enumerate(rows):
            a, b, c = (list(r) + [None, None, None])[:3]
            if a is None or i == 0:
                continue
            s = str(a).strip()
            if s == "INGREDIENTS":
                section = "ing"
                continue
            if s == "STEP-BY-STEP METHOD":
                section = "steps"
                continue
            if s == "GALLEY NOTES":
                section = "notes"
                continue
            if s.startswith("←"):
                continue
            if section is None:
                if b is not None:
                    rec["meta"][s] = str(b).strip()
            elif section == "ing":
                if s != "Ingredient":
                    rec["ingredients"].append({"name": s, "amount": str(b).strip() if b is not None else "", "order": c})
            elif section == "steps":
                if s != "Step":
                    rec["steps"].append({"label": s, "time": str(b).strip() if b is not None else "", "text": str(c).strip() if c else ""})
            elif section == "notes":
                rec["notes"].append(s.lstrip("• ").strip())
        if not str(rec["title"]).startswith(code + ":"):
            die(f"{title}: title does not start with {code}: {rec['title']!r}")
        rec["index"] = index.get(code, {})
        rec["prep"] = prep.get(code, {})
        recipes[code] = rec
    if len(recipes) != 27:
        die(f"expected 27 recipe tabs, found {len(recipes)}")
    return {"rotation": rotation, "recipes": recipes}


# --------------------------------------------------------------------------- conversion


def minutes(text: str | None) -> int | None:
    nums = re.findall(r"\d+", text or "")
    return max(int(n) for n in nums) if nums else None


def to_oz_total(wb_name: str, amount: str) -> tuple[float | None, str]:
    """Total ounces for 16 crew, or (None, reason) when the amount cannot be converted."""
    m = AMOUNT_RE.match(amount)
    if not m:
        return None, f"unparseable amount {amount!r}"
    qty, unit = float(m.group(1)), m.group(2)
    if unit in UNIT_OZ:
        return qty * UNIT_OZ[unit], ""
    per = COUNT_UNIT_OZ.get(wb_name)
    if per is None:
        return None, f"no per-unit weight for {wb_name!r} ({unit})"
    return qty * per, ""


def equipment_for(step_text: str, equipment: dict[str, int]) -> list[int]:
    text = step_text.lower().replace("dutch oven", "dutchpot").replace("sheet pan", "sheetpan")
    ids = []
    for name, pattern in EQUIPMENT_PATTERNS.items():
        if name not in equipment:
            continue
        probe = text
        if name == "Sheet pan":
            probe = step_text.lower()
        if name == "Pot":
            probe = text.replace("dutchpot", "pot")
        if re.search(pattern, probe):
            ids.append(equipment[name])
    return ids


def build_recipe(rec: dict, equipment: dict[str, int], expedition_id: int, warnings: list[str], fixes: list[str]) -> dict:
    code = rec["code"]
    name = str(rec["title"]).split(":", 1)[1].strip()
    meal = {"B": "Breakfast", "L": "Lunch", "D": "Dinner"}[code[0]]
    prep_min = minutes(rec["meta"].get("Prep time")) or 0
    cook_min = minutes(rec["meta"].get("Cook time")) or 0

    notes = [n for n in rec["notes"] if not n.lower().startswith("food safety:")]
    summary_parts = [
        f"WIT 7-week menu {code} · serves {CREW}.",
        "Per person: protein {p}; starch {s}; veg {v}.".format(
            p=rec["meta"].get("Protein / person", "-"), s=rec["meta"].get("Starch / person", "-"), v=rec["meta"].get("Veg / person", "-")),
        f"Prep {prep_min} min, cook {cook_min} min.",
    ]
    if rec["meta"].get("Equipment"):
        summary_parts.append(f"Equipment: {rec['meta']['Equipment']}.")
    if rec["meta"].get("Est. cost per meal"):
        summary_parts.append(f"Est. cost {rec['meta']['Est. cost per meal']}.")
    if notes:
        summary_parts.append("Galley notes: " + " ".join(n.rstrip(".") + "." for n in notes))
    summary = " ".join(summary_parts)

    ingredients = []
    for ing in rec["ingredients"]:
        wb_name = ing["name"]
        if wb_name in SKIP_INGREDIENTS:
            continue
        if wb_name not in INGREDIENTS:
            warnings.append(f"{code}: unmapped ingredient {wb_name!r}")
            continue
        app_name, app_type = INGREDIENTS[wb_name]
        total_oz, why = to_oz_total(wb_name, ing["amount"])
        if total_oz is None:
            warnings.append(f"{code}: {why}")
            continue
        per_person = round(total_oz / CREW, 2)
        if per_person == 0:
            per_person = 0.01
        note = f"{CREW} crew: {ing['amount']}"
        product = PREP_PRODUCT.get(wb_name)
        if product and product in rec["prep"]:
            note += f" · Prep: {rec['prep'][product]} (bag label {code})"
        ingredients.append({
            "ingredient": app_name,
            "type": app_type,
            "expeditions_ingredient_types_id": TYPE_IDS[app_type],
            "oz_per_meal": per_person,
            "prep_notes": note,
            "_source": wb_name,
            "_total_oz": round(total_oz, 1),
        })

    instructions = []
    for n, step in enumerate(rec["steps"], start=1):
        if not step["text"]:
            continue
        text = step["text"]
        for pattern, repl in STEP_TEXT_FIXES:
            fixed = re.sub(pattern, repl, text)
            if fixed != text:
                fixes.append(f"{code} step {n}: {re.search(pattern, text).group(0)!r} -> {repl!r}")
                text = fixed
        dur = minutes(step["time"])
        instructions.append({
            "step": n,
            "instructions": text,
            "duration": str(dur) if dur else "",
            "expedition_galley_equipment_id": equipment_for(text, equipment),
        })

    return {
        "code": code,
        "cookbook": {
            "recipe_name": name,
            "recipe_photo": None,
            "type": meal,
            "types": [meal],
            "summary": summary,
            "duration_minutes": str(prep_min + cook_min) if (prep_min + cook_min) else "",
            "expeditions_id": [expedition_id],
        },
        "ingredients": ingredients,
        "instructions": instructions,
    }


# --------------------------------------------------------------------------- xano


class Xano:
    def __init__(self, key: str):
        self.key = key
        self.calls = 0

    def request(self, method: str, path: str, body: dict | None = None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(XANO_BASE + path, data=data, method=method)
        req.add_header(KEY_HEADER, self.key)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as res:
                    self.calls += 1
                    raw = res.read()
                    return json.loads(raw) if raw else None
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="replace")[:300]
                if e.code == 429 and attempt < 3:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise RuntimeError(f"{method} {path} -> {e.code}: {detail}") from None
            except urllib.error.URLError as e:
                if attempt < 3:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise RuntimeError(f"{method} {path} -> {e}") from None

    def get(self, path):
        return self.request("GET", path)

    def post(self, path, body):
        return self.request("POST", path, body)

    def patch(self, path, body):
        return self.request("PATCH", path, body)

    def delete(self, path):
        return self.request("DELETE", path)


def load_key() -> str:
    key = os.environ.get("XANO_EXPEDITIONS_APP_KEY")
    if not key:
        env = REPO_ROOT / ".env.local"
        if env.exists():
            for line in env.read_text(encoding="utf-8").splitlines():
                if line.startswith("XANO_EXPEDITIONS_APP_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        die("XANO_EXPEDITIONS_APP_KEY not set (env or .env.local)")
    return key


# --------------------------------------------------------------------------- menu plan


def plan_menu(xano: Xano, rotation: list[dict], expedition_id: int, from_date: dt.date, overwrite: bool, start_date: dt.date | None) -> dict:
    schedules = xano.get(f"/expedition_schedule?expeditions_id={expedition_id}")
    if not schedules:
        die(f"no schedule days for expedition {expedition_id}")
    by_date = {s["date"]: s for s in schedules}
    first = start_date or dt.date.fromisoformat(min(by_date))
    if first.weekday() != 0:
        die(f"rotation starts on a Monday but the anchor date {first} is a {first.strftime('%A')}; pass --start-date")

    items = xano.get("/expedition_schedule_items")
    sched_ids = {s["id"] for s in schedules}
    slots: dict[tuple[int, int], list[dict]] = {}
    for it in items:
        if it.get("isTemplate") or it.get("expedition_schedule_id") not in sched_ids:
            continue
        t = it.get("expedition_schedule_item_types_id")
        if t in (1, 2, 3):
            slots.setdefault((it["expedition_schedule_id"], t), []).append(it)

    days = []
    for date_str in sorted(by_date):
        d = dt.date.fromisoformat(date_str)
        idx = (d - first).days
        row = rotation[idx] if 0 <= idx < len(rotation) else None
        day = {"date": date_str, "weekday": d.strftime("%a"), "schedule_id": by_date[date_str]["id"], "week": row["week"] if row else None, "meals": {}}
        for letter, (label, type_id, t_in, t_out) in MEAL_TYPES.items():
            code = row[letter] if row else None
            existing = slots.get((by_date[date_str]["id"], type_id), [])
            cur = existing[0] if existing else None
            if code is None:
                action = "no-rotation-row"
            elif d < from_date:
                action = "skip-past"
            elif cur is None:
                action = "create"
            elif cur.get("expedition_cookbook_id") in (0, None):
                action = "set"
            elif overwrite:
                action = "overwrite"
            else:
                action = "keep-existing"
            day["meals"][letter] = {
                "code": code, "action": action,
                "item_id": cur["id"] if cur else None,
                "current_cookbook_id": cur.get("expedition_cookbook_id") if cur else None,
                "duplicates": [e["id"] for e in existing[1:]],
            }
        days.append(day)
    return {"anchor_monday": first.isoformat(), "from_date": from_date.isoformat(), "days": days}


# --------------------------------------------------------------------------- preview


def write_preview(built: list[dict], menu: dict, warnings: list[str], fixes: list[str], cookbook_existing: list[dict], expedition_id: int) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "preview.json").write_text(json.dumps({"recipes": built, "menu": menu, "warnings": warnings, "fixes": fixes}, indent=1, ensure_ascii=False), encoding="utf-8")

    existing_names = {r["recipe_name"].strip().lower(): r for r in cookbook_existing}
    L = []
    L.append(f"# WIT 7-week menu import preview\n")
    L.append(f"Generated {dt.datetime.now():%Y-%m-%d %H:%M}. Expedition {expedition_id}. Nothing has been written to Xano.\n")
    if warnings:
        L.append("## Warnings\n")
        L += [f"- {w}" for w in warnings]
        L.append("")
    if fixes:
        L.append("## Step text corrected\n")
        L.append("The workbook's ingredient tables were revised to 10 lb of leg quarters per meal but these steps still said 12 lb:\n")
        L += [f"- {f}" for f in fixes]
        L.append("")
    counts = {}
    for d in menu["days"]:
        for m in d["meals"].values():
            counts[m["action"]] = counts.get(m["action"], 0) + 1
    L.append("## Menu summary\n")
    L.append(f"Rotation anchored to Monday {menu['anchor_monday']}; days before {menu['from_date']} are skipped.\n")
    L.append("| action | slots |\n|---|---|")
    L += [f"| {k} | {v} |" for k, v in sorted(counts.items())]
    L.append("")
    L.append("## Menu by day\n")
    L.append("| date | day | wk | Breakfast | Lunch | Dinner |\n|---|---|---|---|---|---|")
    for d in menu["days"]:
        cells = []
        for letter in "BLD":
            m = d["meals"][letter]
            tag = {"create": "+", "set": "", "overwrite": "!", "keep-existing": "keep", "skip-past": "past", "no-rotation-row": "-"}[m["action"]]
            cells.append(f"{m['code'] or '-'} {tag}".strip() + (f" (has #{m['current_cookbook_id']})" if m["action"] in ("keep-existing", "overwrite") else ""))
        L.append(f"| {d['date']} | {d['weekday']} | {d['week'] or '-'} | " + " | ".join(cells) + " |")
    L.append("\nLegend: `+` meal item will be created, blank = recipe set on the existing empty slot, `keep` = slot already has a recipe (left alone), `past` = before from-date, `!` = would overwrite.\n")

    L.append("## Ingredient name mapping\n")
    L.append("| workbook name | app name | type | used in |\n|---|---|---|---|")
    used: dict[str, list[str]] = {}
    for r in built:
        for ing in r["ingredients"]:
            used.setdefault(ing["_source"], []).append(r["code"])
    for wb_name, (app_name, app_type) in INGREDIENTS.items():
        L.append(f"| {wb_name} | {app_name} | {app_type} | {', '.join(used.get(wb_name, []))} |")
    L.append("")

    L.append("## Recipes\n")
    for r in built:
        cb = r["cookbook"]
        clash = existing_names.get(cb["recipe_name"].lower())
        L.append(f"### {r['code']} · {cb['recipe_name']}\n")
        L.append(f"**{cb['type']}** · {cb['duration_minutes']} min total" + (f" · ALREADY EXISTS as cookbook #{clash['id']}" if clash else "") + "\n")
        L.append(f"> {cb['summary']}\n")
        L.append("| ingredient | type | oz / person | 16 crew (workbook) | prep notes |\n|---|---|---|---|---|")
        for ing in r["ingredients"]:
            L.append(f"| {ing['ingredient']} | {ing['type']} | {ing['oz_per_meal']} | {ing['_total_oz']} oz | {ing['prep_notes']} |")
        L.append("")
        L.append("| step | min | equipment ids | instruction |\n|---|---|---|---|")
        for st in r["instructions"]:
            L.append(f"| {st['step']} | {st['duration'] or '-'} | {','.join(map(str, st['expedition_galley_equipment_id'])) or '-'} | {st['instructions']} |")
        L.append("")
    (OUT_DIR / "preview.md").write_text("\n".join(L), encoding="utf-8")


# --------------------------------------------------------------------------- load / rollback


def load(xano: Xano, built: list[dict], menu: dict | None, expedition_id: int, log_path: Path) -> None:
    log = {"started": dt.datetime.now().isoformat(timespec="seconds"), "expedition_id": expedition_id,
           "created_cookbook": [], "created_ingredients": [], "created_instructions": [], "created_items": [], "patched_items": []}

    def save():
        log_path.write_text(json.dumps(log, indent=1), encoding="utf-8")

    code_to_id: dict[str, int] = {}
    if built:
        existing = xano.get("/expedition_cookbook")
        for r in built:
            cb = r["cookbook"]
            match = next((e for e in existing if e["recipe_name"].strip().lower() == cb["recipe_name"].lower()
                          and expedition_id in (e.get("expeditions_id") or [])), None)
            if match:
                rid = match["id"]
                print(f"[{r['code']}] exists as #{rid}: {cb['recipe_name']}")
            else:
                created = xano.post("/expedition_cookbook", cb)
                rid = created["id"]
                log["created_cookbook"].append(rid)
                save()
                print(f"[{r['code']}] created #{rid}: {cb['recipe_name']}")
            code_to_id[r["code"]] = rid
            detail = xano.get(f"/expedition_cookbook/{rid}")
            if detail.get("ingredients"):
                print(f"    ingredients already present ({len(detail['ingredients'])}), skipped")
            else:
                for ing in r["ingredients"]:
                    body = {k: v for k, v in ing.items() if not k.startswith("_")}
                    body["expedition_cookbook_id"] = rid
                    row = xano.post("/expeditions_recipes", body)
                    log["created_ingredients"].append(row["id"])
                save()
                print(f"    {len(r['ingredients'])} ingredients added")
            if detail.get("instructions"):
                print(f"    instructions already present ({len(detail['instructions'])}), skipped")
            else:
                for st in r["instructions"]:
                    body = dict(st, expedition_cookbook_id=rid)
                    row = xano.post("/expedition_recipe_instructions", body)
                    log["created_instructions"].append(row["id"])
                save()
                print(f"    {len(r['instructions'])} steps added")
    else:
        existing = xano.get("/expedition_cookbook")

    if menu:
        if not code_to_id:
            # menu-only: resolve codes from the summary prefix "WIT 7-week menu B1"
            for e in existing:
                m = re.match(r"WIT 7-week menu ([BLD]\d+)\b", e.get("summary") or "")
                if m and expedition_id in (e.get("expeditions_id") or []):
                    code_to_id[m.group(1)] = e["id"]
        missing = {m["code"] for d in menu["days"] for m in d["meals"].values() if m["code"] and m["code"] not in code_to_id}
        if missing:
            die(f"recipes not found in the cookbook for codes {sorted(missing)}; run without --menu-only first")
        for d in menu["days"]:
            for letter, m in d["meals"].items():
                if m["action"] not in ("create", "set", "overwrite"):
                    continue
                label, type_id, t_in, t_out = MEAL_TYPES[letter]
                rid = code_to_id[m["code"]]
                if m["action"] == "create":
                    body = {"name": label, "isTemplate": False, "expedition_schedule_item_types_id": type_id,
                            "expedition_schedule_id": d["schedule_id"], "time_in": t_in, "time_out": t_out,
                            "participants": [], "students_id": [], "led_by": 0, "notes": "", "address": "",
                            "things_to_bring": "", "resources": "", "expedition_cookbook_id": rid}
                    row = xano.post("/expedition_schedule_items", body)
                    log["created_items"].append(row["id"])
                else:
                    cur = xano.get(f"/expedition_schedule_items/{m['item_id']}")
                    body = {k: cur.get(k) for k in ("name", "isTemplate", "expedition_schedule_item_types_id", "expedition_schedule_id",
                                                     "time_in", "time_out", "participants", "students_id", "led_by", "notes",
                                                     "address", "things_to_bring", "resources")}
                    body["expedition_cookbook_id"] = rid
                    xano.patch(f"/expedition_schedule_items/{m['item_id']}", body)
                    log["patched_items"].append({"id": m["item_id"], "previous_cookbook_id": cur.get("expedition_cookbook_id") or 0})
                save()
                print(f"{d['date']} {label:9} {m['code']:4} -> #{rid} ({m['action']})")
    log["finished"] = dt.datetime.now().isoformat(timespec="seconds")
    save()
    print(f"\nDone in {xano.calls} API calls. Log: {log_path}")


def rollback(xano: Xano, log_path: Path) -> None:
    if not log_path.exists():
        die(f"no load log at {log_path}")
    log = json.loads(log_path.read_text(encoding="utf-8"))
    for p in log.get("patched_items", []):
        cur = xano.get(f"/expedition_schedule_items/{p['id']}")
        body = {k: cur.get(k) for k in ("name", "isTemplate", "expedition_schedule_item_types_id", "expedition_schedule_id",
                                         "time_in", "time_out", "participants", "students_id", "led_by", "notes",
                                         "address", "things_to_bring", "resources")}
        body["expedition_cookbook_id"] = p["previous_cookbook_id"]
        xano.patch(f"/expedition_schedule_items/{p['id']}", body)
    print(f"restored {len(log.get('patched_items', []))} meal slots")
    for key, path in (("created_items", "/expedition_schedule_items"), ("created_instructions", "/expedition_recipe_instructions"),
                      ("created_ingredients", "/expeditions_recipes"), ("created_cookbook", "/expedition_cookbook")):
        for rid in log.get(key, []):
            try:
                xano.delete(f"{path}/{rid}")
            except RuntimeError as e:
                print(f"  could not delete {path}/{rid}: {e}")
        print(f"deleted {len(log.get(key, []))} from {path}")
    log_path.rename(log_path.with_suffix(f".rolled-back-{dt.datetime.now():%Y%m%d-%H%M%S}.json"))


# --------------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["preview", "load", "rollback"])
    ap.add_argument("workbook", nargs="?")
    ap.add_argument("--expedition", type=int, default=14)
    ap.add_argument("--from-date", help="first date to touch (default: today)")
    ap.add_argument("--start-date", help="Monday the rotation's Week 1 starts on (default: expedition's first schedule day)")
    ap.add_argument("--overwrite", action="store_true", help="replace recipes already set on meal slots")
    ap.add_argument("--recipes-only", action="store_true")
    ap.add_argument("--menu-only", action="store_true")
    args = ap.parse_args()

    xano = Xano(load_key())
    log_path = OUT_DIR / "load-log.json"

    if args.mode == "rollback":
        rollback(xano, log_path)
        return
    if not args.workbook:
        die("workbook path required")

    data = read_workbook(args.workbook)
    equipment = {e["name"]: e["id"] for e in xano.get("/expedition_galley_equipment")}
    warnings: list[str] = []
    fixes: list[str] = []
    built = [build_recipe(data["recipes"][c], equipment, args.expedition, warnings, fixes)
             for c in sorted(data["recipes"], key=lambda k: ("BLD".index(k[0]), int(k[1:])))]
    from_date = dt.date.fromisoformat(args.from_date) if args.from_date else dt.date.today()
    start_date = dt.date.fromisoformat(args.start_date) if args.start_date else None
    menu = plan_menu(xano, data["rotation"], args.expedition, from_date, args.overwrite, start_date)

    if args.mode == "preview":
        write_preview(built, menu, warnings, fixes, xano.get("/expedition_cookbook"), args.expedition)
        print(f"preview written to {OUT_DIR / 'preview.md'} and preview.json")
        if warnings:
            print("WARNINGS:", *warnings, sep="\n  ")
        return

    if warnings:
        die("fix these before loading:\n  " + "\n  ".join(warnings))
    if log_path.exists():
        die(f"{log_path} exists from a previous load; roll it back or move it aside first")
    load(xano, [] if args.menu_only else built, None if args.recipes_only else menu, args.expedition, log_path)


if __name__ == "__main__":
    main()
