import csv
from pathlib import Path

csv_path = Path(
    r"C:\Users\USUARIO\Downloads\private-1785870970055-1785870970055-product-exports.csv"
)
rows = list(csv.DictReader(csv_path.open(encoding="utf-8")))
seen = set()
products = []
for r in rows:
    h = r["Product Handle"]
    if h in seen:
        continue
    seen.add(h)
    products.append(
        {
            "handle": h,
            "title": r["Product Title"] or "",
            "desc": r.get("Product Description") or "",
            "price": r.get("Variant Price COP") or "",
            "sku": r.get("Variant Sku") or "",
        }
    )


def is_envase(p):
    d = (p["desc"] + p["title"] + p["handle"]).lower()
    return "envase" in d or any(
        k in p["handle"]
        for k in [
            "rosca",
            "agrafe",
            "cilindrico",
            "copa",
            "corazon",
            "replica",
            "lujo",
            "ml-aaa",
            "ml-aa",
        ]
    )


envases = [p for p in products if is_envase(p)]
handles = {p["handle"]: p for p in products}
env_handles = {p["handle"]: p for p in envases}

# Desired empty bottles from Caro's photo captions (physical bottles)
desired = [
    ("1 million agrafe 100 ml", ["1-million-replica-agrafe-100-ml", "1-million-agrafe-100-ml"]),
    ("1 million AAA 100 ml", ["1-million-replica-agrafe-100-ml-aaa", "1-million-agrafe-100-ml-aaa"]),
    ("1 million 30 ml", ["1-million-rosca-replica-30-ml"]),
    ("212 AAA 100 ml", ["212-aaa", "212-agrafe"]),
    ("212 rosca 100 ml", ["212-rosca-replica-100-ml"]),
    ("360 agrafe 100 ml", ["360-agrafe-replica-100-ml"]),
    ("Agatha rosca 55 ml", ["agatha-lujo-rosca-55-ml"]),
    ("Arabe rosca 50 ml", ["arabe-rosca-replica-50-ml", "arabe-rosca-50-ml"]),
    ("Arabia rosca 30 ml", ["arabia-rosca-30-ml"]),
    ("Arsenal rosca 100 ml", ["arsenal-rosca", "granada-arsenal-rosca"]),
    ("360 AAA 100 ml", ["360-aaa"]),
    ("Arsenal AAA 100 ml", ["arsenal-agrafe"]),
    ("Beauty 55 ml", ["beauty-rosca-lujo-55-ml"]),
    ("Bella rosca 100 ml", ["bella-rosca-replica-100-ml"]),
    ("Bella rosca 50 ml", ["bella-rosca-replica-50"]),
    ("Bella rosca 55 ml", ["bella-rosca-replica-55"]),
    ("La vida es bella AAA", ["la-vie-est-belle", "vida-es-bella"]),
    ("Buterfly rosca 80 ml", ["butter-fly-rosca-lujo-80-ml"]),
    ("Calavera rosca 60 ml", ["calaver"]),
    ("Amber oud AAA", ["amber-oud-100-ml-aaa", "amber-oud-agrafe-100-ml-aaa"]),
    ("Amber oud AAA baul", ["amber-oud-100-ml-aaa", "amber-oud-agrafe-100-ml-aaa"]),
    ("212 heroes men", ["212-heroes"]),
    ("212 heroes forever young", ["212-heroes-forever"]),
    ("212 men rosca 100 ml", ["212-men-rosca", "212-men-agrafe"]),
    ("212 men Aqua AAA 100 ml", ["212-men-aqua"]),
    ("212 sexy men AAA 100 ml", ["212-sexy-men"]),
    ("212 vip AAA 100 ml", ["212-vip-aaa", "212-vip-agrafe", "212-vip-rosca"]),
    ("212 vip rose AAA 100 ml", ["212-vip-rose"]),
    ("273 AAA 100 ml", ["273-aaa", "273-agrafe", "273-rosca"]),
    ("360 men AAA 100 ml", ["360-men-aaa", "360-aaa"]),
    ("360 coral AAA 100 ml", ["360-coral"]),
    ("360 red men AAA 100 ml", ["360-red"]),
    ("Can can AAA 100 ml", ["can-can-aaa", "can-can-agrafe"]),
    ("9pm AAA 100 ml", ["9pm"]),
    ("Canal rosca 60 ml", ["canal-bleu-rosca-replica-60-ml", "canal-rosca-lujo-60-ml"]),
    ("Cat rosca", ["cat-meau-rosca", "cat-rosca"]),
    ("Cilindrico rosca 100 ml", ["cilindrico-rosca-lujo-100-ml", "cilindrico-de-lujo-100-ml"]),
    ("Cilindrico rosca 50 ml", ["cilindrico-rosca-lujo-50-ml"]),
    ("Cloud AAA 100 ml", ["cloud-agrafe-100-ml-aaa"]),
    ("Cool rosca 100 ml", ["cool-rosca-lujo-100-ml", "cool-rosca-100-ml"]),
    ("Invictus rosca 100 ml", ["copa-invictus-rosca-replica-100-ml", "copa-invictus-replica-100-ml"]),
    ("Copa rosca 50 ml", ["copa-invictus-rosca-replica-50-ml"]),
    ("Copa rosca 30 ml", ["copa-invictus-rosca-replica-30-ml"]),
    ("Invictus 100 ml AAA", ["invictus-aaa", "copa-invictus-aaa"]),
    ("Corazon color 50 ml", ["corazon-rosca-color-50-ml"]),
    ("Corazon cristal 60 ml", ["corazon-rosca-cristal-60-ml"]),
    ("Creed rosca 100 ml", ["creed-rosca-replica-100-ml"]),
    ("Black xs AAA 100 ml", ["black-xs-m-agrafe", "black-xs-aaa"]),
    ("Brigth cristal AAA 100 ml", ["bright-versace-rosca-replica-100-ml", "bright-aaa"]),
    ("Dorso 100 ml", ["dorso-rosca-lujo-100-ml", "dorso-rosca-replica-100-ml"]),
    ("Eiffel 50 ml", ["eiffel-rosca-lujo-50-ml"]),
    ("Farenheit AAA 100 ml", ["fahrenheit-rosca-replica-100-ml", "fahrenheit-aaa"]),
    ("Fantasy AAA 100 ml", ["fantasy-agrafe-replica-100-ml", "fantasy-rosca-replica-110-ml"]),
]

print("=== MISSING / ESSENCE-ONLY (need envase registration?) ===\n")
for name, keys in desired:
    matches = []
    for h, p in env_handles.items():
        if any(k in h for k in keys):
            # prefer empty bottle descriptions
            kind = "envase" if "envase" in p["desc"].lower() else "otro"
            matches.append((kind, p))
    if matches:
        # show if only prepared replica, not empty
        empty = [p for k, p in matches if "vacío" in p["desc"].lower() or "vacio" in p["desc"].lower() or "Envase AA" in p["desc"] or "Envase AAA" in p["desc"] or "Envase vacío" in p["desc"] or "Envase vac" in p["desc"]]
        prep = [p for k, p in matches if "preparada" in p["desc"].lower()]
        if empty:
            print(f"OK   | {name}")
            for p in empty[:2]:
                print(f"       empty: {p['handle']} | {p['title']} | {p['sku']} | {p['price']}")
        elif prep:
            print(f"PREP | {name}  (hay réplica preparada, NO envase vacío)")
            for p in prep[:2]:
                print(f"       prep: {p['handle']} | {p['sku']} | {p['price']}")
        else:
            print(f"OK?  | {name}")
            for k, p in matches[:2]:
                print(f"       {k}: {p['handle']} | {p['desc'][:50]}")
    else:
        essence = [p for h, p in handles.items() if any(k in h for k in keys)]
        if essence:
            print(f"MISS | {name}  (solo esencia u otro)")
            for p in essence[:2]:
                print(f"       {p['handle']} | {p['title']}")
        else:
            print(f"MISS | {name}  (no existe nada)")
