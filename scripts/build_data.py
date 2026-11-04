"""
Shahapur data builder.

Joins the three real data sources into the static JS/JSON files the portal loads:

  1. Shahapur DATA_31-10-26.xlsx           -> one row per unit (ward, property, partition)
  2. Shahapur Tagged Data/FINAL DATA TAGGED (updated)/WARD_n.shp/.dbf
                                            -> building footprints tagged via `newpropno`
  3. Shahapur photos/Shahapur photos/*.jpg  -> unit photos  (W-P-A.jpg, W-P-N-A.jpg, ...-B.jpg)
     PLANS/PLANS_PNG/*.png                  -> unit plans   (W-P.png,   W-P-N.png)

Every unit is identified by one key: (ward, property, partition), where partition 0
means the main unit (blank `partitionNo` in Excel). Photos and plans use exactly the
same numbering, e.g. `1-2-3-A.jpg` is ward 1, property 2, partition 3, photo A.
(This was verified against the "Shahapur 1:- 2-1-A" stamp printed on the photos.)

No values are invented: missing data stays empty and the UI shows "Not recorded".
A link report is written to data/linkReport.json so mismatches can be fixed at source.

Run:  python scripts/build_data.py
"""
import os
import re
import sys
import math
import json
import struct
import hashlib
from collections import defaultdict

import openpyxl

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXCEL_PATH = os.path.join(BASE_DIR, "Shahapur DATA_31-10-26.xlsx")
PHOTOS_DIR = os.path.join(BASE_DIR, "Shahapur photos", "Shahapur photos")
PLANS_DIR = os.path.join(BASE_DIR, "PLANS", "PLANS_PNG")
TAGGED_DIR = os.path.join(BASE_DIR, "Shahapur Tagged Data", "FINAL DATA TAGGED (updated)")
OUTPUT_DIR = os.path.join(BASE_DIR, "data")
WARDS = range(1, 6)
UTM_WARDS = {2, 3, 4, 5}  # Ward 1 .prj is WGS84 geographic; wards 2-5 are WGS84 / UTM 43N

os.makedirs(OUTPUT_DIR, exist_ok=True)
report = {"warnings": []}


def warn(msg):
    report["warnings"].append(msg)
    print("  WARNING:", msg)


# ---------------------------------------------------------------------------
# Coordinate helpers
# ---------------------------------------------------------------------------
def utm_to_latlon(easting, northing, zone=43):
    a = 6378137.0
    f = 1 / 298.257223563
    e = math.sqrt(2 * f - f * f)
    e1sq = e * e / (1 - e * e)
    k0 = 0.9996
    x = easting - 500000.0
    m = northing / k0
    mu = m / (a * (1 - e * e / 4 - 3 * e ** 4 / 64 - 5 * e ** 6 / 256))
    e1 = (1 - math.sqrt(1 - e * e)) / (1 + math.sqrt(1 - e * e))
    fp = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu)
          + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
          + (151 * e1 ** 3 / 96) * math.sin(6 * mu)
          + (1097 * e1 ** 4 / 512) * math.sin(8 * mu))
    c1 = e1sq * math.cos(fp) ** 2
    t1 = math.tan(fp) ** 2
    r1 = a * (1 - e * e) / math.pow(1 - e * e * math.sin(fp) ** 2, 1.5)
    n1 = a / math.sqrt(1 - e * e * math.sin(fp) ** 2)
    d = x / (n1 * k0)
    lat = fp - (n1 * math.tan(fp) / r1) * (
        d * d / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * e1sq) * d ** 4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * e1sq - 3 * c1 * c1) * d ** 6 / 720)
    lon0 = (zone - 1) * 6 - 180 + 3
    lon = math.radians(lon0) + (
        d - (1 + 2 * t1 + c1) * d ** 3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * e1sq + 24 * t1 * t1) * d ** 5 / 120) / math.cos(fp)
    return round(math.degrees(lon), 7), round(math.degrees(lat), 7)


def to_mercator(lon, lat):
    """WGS84 degrees -> Web Mercator metres (WKID 3857)."""
    x = lon * 20037508.342789244 / 180.0
    y = math.log(math.tan((90.0 + lat) * math.pi / 360.0)) / (math.pi / 180.0) * 20037508.342789244 / 180.0
    return [round(x, 2), round(y, 2)]


# ---------------------------------------------------------------------------
# Small value helpers
# ---------------------------------------------------------------------------
def text(v):
    return "" if v is None else str(v).strip()


def num(v):
    try:
        return round(float(v), 2) if text(v) != "" else 0.0
    except ValueError:
        return 0.0


def yes(v):
    return "Yes" if text(v).lower() == "yes" else "No"


def file_md5(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


# ---------------------------------------------------------------------------
# 1. Photo index:  (ward, prop, partition) -> [files], ordered A, B, C, then extra shots
# ---------------------------------------------------------------------------
PHOTO_UNIT_RE = re.compile(r"^(\d+)-(\d+)(?:-(\d+))?(?:-([A-Z]))?(?:\s*\((\d+)\))?$", re.I)
PHOTO_RANGE_RE = re.compile(r"^(\d+)-(\d+)-(\d+)\s+to\s+(\d+)-(\d+)-([A-Z])(?:\s*\((\d+)\))?$", re.I)


def index_photos():
    unit_photos = defaultdict(list)   # key -> [(sort_key, filename)]
    range_photos = defaultdict(list)  # (w, p) -> [(first_part, last_part, filename)]
    unparsed = []
    for fn in sorted(os.listdir(PHOTOS_DIR)):
        if not fn.lower().endswith(".jpg"):
            continue
        base = os.path.splitext(fn)[0].strip()

        m = PHOTO_RANGE_RE.match(base)
        if m:
            w, p, first, p2, last = int(m[1]), int(m[2]), int(m[3]), int(m[4]), int(m[5])
            if p2 != p:
                warn(f"Range photo '{fn}' spans two properties ({p} and {p2}); ignored.")
                continue
            range_photos[(w, p)].append((first, last, fn))
            continue

        m = PHOTO_UNIT_RE.match(base)
        if not m:
            unparsed.append(fn)
            continue
        w, p = int(m[1]), int(m[2])
        part = int(m[3]) if m[3] else 0
        letter = (m[4] or "A").upper()     # '2-132-1.jpg' has no letter -> treat as A
        extra = int(m[5]) if m[5] else 0   # '1-104-A (1).jpg' is a second A shot
        unit_photos[(w, p, part)].append(((letter, extra), fn))

    if unparsed:
        warn(f"{len(unparsed)} photo file names could not be parsed: {unparsed[:10]}")
    ordered = {k: [fn for _, fn in sorted(v)] for k, v in unit_photos.items()}
    total = sum(len(v) for v in ordered.values()) + sum(len(v) for v in range_photos.values())
    print(f"  Photos: {total} indexed for {len(ordered)} units, {len(range_photos)} shared range photos.")
    return ordered, range_photos


# ---------------------------------------------------------------------------
# 2. Plan index:  (ward, prop, partition) -> [files]  (plain file first, distinct WD revision second)
# ---------------------------------------------------------------------------
PLAN_RE = re.compile(r"^(WD\s*)?(\d+)-(\d+)(?:-(\d+))?(\s*-\s*Copy)?\.?$", re.I)


def index_plans():
    candidates = defaultdict(list)  # key -> [(priority, filename)]
    unparsed = []
    for fn in sorted(os.listdir(PLANS_DIR)) if os.path.isdir(PLANS_DIR) else []:
        if not fn.lower().endswith(".png"):
            continue
        m = PLAN_RE.match(os.path.splitext(fn)[0].strip())
        if not m:
            unparsed.append(fn)
            continue
        key = (int(m[2]), int(m[3]), int(m[4]) if m[4] else 0)
        priority = 2 if m[5] else (1 if m[1] else 0)  # plain < WD revision < "- Copy"
        candidates[key].append((priority, fn))

    if unparsed:
        warn(f"{len(unparsed)} plan file names could not be parsed: {unparsed[:10]}")

    plans = {}
    dropped = 0
    for key, files in candidates.items():
        files.sort()
        kept, seen = [], set()
        for _, fn in files:
            digest = file_md5(os.path.join(PLANS_DIR, fn)) if len(files) > 1 else fn
            if digest in seen:
                dropped += 1  # byte-identical duplicate ("- Copy")
                continue
            seen.add(digest)
            kept.append(fn)
        plans[key] = kept
    print(f"  Plans: {sum(len(v) for v in plans.values())} kept for {len(plans)} units ({dropped} identical copies dropped).")
    return plans


# ---------------------------------------------------------------------------
# 3. Excel register -> one record per unit
# ---------------------------------------------------------------------------
# Column indexes in 'Shahapur DATA_31-10-26' (row 1 is the header).
# NOTE: column 2 is also called 'wardNo' but holds an internal code (1,4,5,6,7);
#       column 1 holds the real ward number 1-5 used by photos, plans and shapefiles.
COL = {
    "ownerID": 0, "wardNo": 1, "propertyNo": 3, "partitionNo": 4, "wardNoOld": 5,
    "propertyNoOld": 6, "plotNo": 7, "ownerTitle": 8, "ownerName": 9, "ownerNameMarathi": 10,
    "ownerAddress": 11, "ownerAddressMarathi": 12, "description": 13, "shopBuildingName": 14,
    "shopNo": 15, "waterConnection": 18, "borewell": 19, "rainwaterHarvesting": 20, "solar": 21,
    "lift": 24, "propertyTaxOld": 25, "rvOld": 26, "contactNo": 27, "emailID": 28,
    "propertyRemark": 29, "isOpenPlot": 30, "buildupArea": 31, "totalTaxOld": 32,
    "citySurveyGatNo": 33, "wingNo": 36, "plotShopGaleNo": 37, "plotArea": 56,
}


def read_register(unit_photos, range_photos, unit_plans):
    ws = openpyxl.load_workbook(EXCEL_PATH, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    assert header[COL["propertyNo"]] == "propertyNo" and header[COL["partitionNo"]] == "partitionNo", \
        "Excel column layout changed - update COL in build_data.py"

    records, by_key, by_prop = [], {}, defaultdict(list)
    skipped = 0
    for r in rows:
        ward, prop = text(r[COL["wardNo"]]), text(r[COL["propertyNo"]])
        if not ward.isdigit() or not prop.isdigit():
            skipped += 1
            continue
        w, p = int(ward), int(prop)
        part_txt = text(r[COL["partitionNo"]])
        part = int(part_txt) if part_txt.isdigit() else 0
        key = (w, p, part)
        if key in by_key:
            warn(f"Duplicate Excel unit W{w}-{p}-{part}; keeping the first row.")
            continue

        photos = list(unit_photos.get(key, []))
        # Shared building photo ("1-3-1 to 3-33-B.jpg") as a fallback B photo for those partitions
        for first, last, fn in range_photos.get((w, p), []):
            if first <= part <= last and fn not in photos and not any("-B" in x.upper() for x in photos):
                photos.append(fn)
        plans = unit_plans.get(key, [])

        assessed_total = num(r[COL["totalTaxOld"]])
        property_tax = num(r[COL["propertyTaxOld"]])
        assessed = assessed_total if assessed_total > 0 else property_tax
        area = num(r[COL["buildupArea"]])

        rec = {
            "propertyId": int(r[COL["ownerID"]]) if text(r[COL["ownerID"]]).isdigit() else len(records) + 1,
            "ownerID": text(r[COL["ownerID"]]),
            "unitKey": f"{w}-{p}-{part}",
            "wardNo": str(w),
            "propertyNo": str(p),
            "partitionNo": str(part) if part else "",
            "propIdentifier": f"W{w}-{p}" + (f"/{part}" if part else ""),
            "wardNoOld": text(r[COL["wardNoOld"]]),
            "propertyNoOld": text(r[COL["propertyNoOld"]]),
            "plotNo": text(r[COL["plotNo"]]),
            "ownerTitle": text(r[COL["ownerTitle"]]),
            "ownerName": text(r[COL["ownerName"]]),
            "ownerNameMarathi": text(r[COL["ownerNameMarathi"]]),
            "ownerAddress": text(r[COL["ownerAddress"]]),
            "ownerAddressMarathi": text(r[COL["ownerAddressMarathi"]]),
            "description": text(r[COL["description"]]),
            "shopBuildingName": text(r[COL["shopBuildingName"]]),
            "shopNo": text(r[COL["shopNo"]]),
            "wingNo": text(r[COL["wingNo"]]),
            "plotShopGaleNo": text(r[COL["plotShopGaleNo"]]),
            "citySurveyGatNo": text(r[COL["citySurveyGatNo"]]),
            "contactNo": text(r[COL["contactNo"]]),
            "emailID": text(r[COL["emailID"]]),
            "propertyRemark": text(r[COL["propertyRemark"]]),
            "isOpenPlot": yes(r[COL["isOpenPlot"]]),
            "buildupAreaSqMtr": area,
            "buildupAreaSqFt": round(area * 10.7639, 2) if area else 0.0,
            "plotAreaSqMtr": num(r[COL["plotArea"]]),
            "waterConnection": yes(r[COL["waterConnection"]]),
            "borewell": yes(r[COL["borewell"]]),
            "solar": yes(r[COL["solar"]]),
            "rainwaterHarvesting": yes(r[COL["rainwaterHarvesting"]]),
            "lift": yes(r[COL["lift"]]),
            "totalTaxOld": assessed_total,
            "propertyTaxOld": property_tax,
            "rvOld": num(r[COL["rvOld"]]),
            # The register has no payment columns, so nothing is marked as paid.
            "assessedAmount": assessed,
            "paidAmount": 0.0,
            "pendingAmount": assessed,
            "status": "Assessed" if assessed > 0 else "Unassessed",
            "lastPaymentDate": "",
            "photos": photos,
            "plans": plans,
            "plan": plans[0] if plans else "",
            "buildingIds": [],   # filled after shapefile linking
            "linkType": "",      # 'tagged' | 'inferred' | '' (no footprint)
        }
        records.append(rec)
        by_key[key] = rec
        by_prop[(w, p)].append(rec)

    for units in by_prop.values():
        units.sort(key=lambda u: int(u["partitionNo"] or 0))
    print(f"  Register: {len(records)} units across {len(by_prop)} properties ({skipped} non-data rows skipped).")
    return records, by_key, by_prop


# ---------------------------------------------------------------------------
# 4. Shapefile readers (no external dependency)
# ---------------------------------------------------------------------------
def read_dbf(path):
    with open(path, "rb") as f:
        head = f.read(32)
        num_recs, header_len, rec_len = struct.unpack("<IHH", head[4:12])
        fields = []
        while True:
            fld = f.read(32)
            if not fld or fld[0] == 0x0D:
                break
            fields.append((fld[:11].split(b"\x00")[0].decode("ascii", "ignore"), fld[16]))
        f.seek(header_len)
        records = []
        for _ in range(num_recs):
            raw = f.read(rec_len)
            if not raw or raw[0] == 0x1A:
                break
            row, pos = {"_deleted": raw[0:1] == b"*"}, 1
            for name, length in fields:
                row[name] = raw[pos:pos + length].decode("utf-8", "replace").strip()
                pos += length
            records.append(row)
        return records


def read_shp(path, is_utm):
    shapes = []
    with open(path, "rb") as f:
        f.seek(100)
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                break
            _, content_len = struct.unpack(">II", hdr)
            rec = f.read(content_len * 2)
            if struct.unpack("<I", rec[:4])[0] != 5:  # only polygons
                shapes.append(None)
                continue
            num_parts, num_points = struct.unpack("<II", rec[36:44])
            parts = list(struct.unpack(f"<{num_parts}I", rec[44:44 + num_parts * 4])) + [num_points]
            offset = 44 + num_parts * 4
            pts = []
            for i in range(num_points):
                x, y = struct.unpack("<dd", rec[offset + i * 16: offset + (i + 1) * 16])
                pts.append(list(utm_to_latlon(x, y)) if is_utm else [round(x, 7), round(y, 7)])
            rings = [pts[parts[i]:parts[i + 1]] for i in range(num_parts)]
            shapes.append(rings)
    return shapes


# ---------------------------------------------------------------------------
# 5. Parse `newpropno` tags
#    "577"            -> whole/main unit of property 577
#    "279,279/1,..."  -> property 279 main unit + partition 1 ...
#    "562+563", "379.380", "31 TO 30" -> list of properties (TO is never expanded to a range)
# ---------------------------------------------------------------------------
def parse_tag(raw):
    claims = []  # [(prop, partition or None)]
    cleaned = raw.strip()
    if re.search(r"\bTO\b", cleaned, re.I):
        warn(f"Tag '{raw}' uses 'TO'; linked to the two named properties only.")
        cleaned = re.sub(r"\s*\bTO\b\s*", ",", cleaned, flags=re.I)
    for tok in re.split(r"[,+.]", cleaned):
        tok = tok.strip()
        if not tok or tok.endswith("/"):
            continue  # empty, or the last token of a tag cut at the 254-char DBF limit ('504/')
        m = re.fullmatch(r"(\d+)\s*(?:/\s*(\d+))?", tok)
        if not m:
            warn(f"Unreadable token '{tok}' in tag '{raw}'.")
            continue
        prop = int(m[1])
        if prop == 0:
            continue  # '0' is used for untagged polygons
        claims.append((prop, int(m[2]) if m[2] else None))
    return claims


def build_features():
    shapes_out = []  # dicts with ward, rings, tag, claims
    for w in WARDS:
        shp = os.path.join(TAGGED_DIR, f"WARD_{w}.shp")
        dbf = os.path.join(TAGGED_DIR, f"WARD_{w}.dbf")
        if not (os.path.exists(shp) and os.path.exists(dbf)):
            warn(f"Missing shapefile for ward {w}.")
            continue
        attrs, geoms = read_dbf(dbf), read_shp(shp, is_utm=w in UTM_WARDS)
        if len(attrs) != len(geoms):
            warn(f"Ward {w}: {len(geoms)} shapes but {len(attrs)} attribute rows.")
        for a, rings in zip(attrs, geoms):
            if rings is None or a.get("_deleted"):
                continue
            tag = a.get("newpropno", "").strip() or a.get("Prop_No", "").strip()
            if len(a.get("newpropno", "")) >= 250:
                warn(f"Ward {w} OBJECTID {a.get('OBJECTID')}: newpropno is cut at 254 chars; "
                     "remaining partitions are inferred.")
            shapes_out.append({"ward": w, "rings": rings, "tag": tag,
                               "dbfObjectId": a.get("OBJECTID", ""), "claims": parse_tag(tag)})
        print(f"  Ward {w}: {len(geoms)} footprints read.")
    return shapes_out


# ---------------------------------------------------------------------------
# 6. Assign every register unit to the footprint(s) that tag it
# ---------------------------------------------------------------------------
def link_units(shapes, by_prop):
    # (w, p) -> {"bare": {shape_idx}, "parts": {partition: {shape_idx}}}
    claims = defaultdict(lambda: {"bare": set(), "parts": defaultdict(set)})
    for idx, s in enumerate(shapes):
        for prop, part in s["claims"]:
            c = claims[(s["ward"], prop)]
            if part is None:
                c["bare"].add(idx)
            else:
                c["parts"][part].add(idx)

    shape_units = defaultdict(list)
    stats = defaultdict(int)
    for (w, p), units in by_prop.items():
        c = claims.get((w, p))
        if not c:
            stats["untagged"] += len(units)
            continue
        claimed_parts = sorted(c["parts"])
        for u in units:
            part = int(u["partitionNo"] or 0)
            exact = c["parts"].get(part, set()) if part else c["bare"]
            if exact:
                targets, link = exact, "tagged"
            elif not claimed_parts:
                targets, link = c["bare"], "tagged"   # tag names the whole property
            else:
                # Partition not named (usually a truncated tag): use the footprint that holds
                # the nearest lower partition, i.e. where the truncated list would continue.
                lower = [x for x in claimed_parts if x < part] or claimed_parts[:1]
                targets, link = c["parts"][lower[-1]], "inferred"
            u["linkType"] = link
            stats[link] += 1
            for idx in sorted(targets):
                shape_units[idx].append((u, link))

    # Footprints tagged with a partition the register does not have (e.g. '89/4' while Excel only
    # lists property 89 itself) are structures of that property: show its main record, flagged.
    for (w, p), c in claims.items():
        if (w, p) not in by_prop:
            warn(f"Footprint tag W{w}-{p} has no row in the Excel register.")
            continue
        main_unit = by_prop[(w, p)][0]
        for part, idxs in c["parts"].items():
            for idx in idxs:
                if not any(u["propertyNo"] == str(p) for u, _ in shape_units[idx]):
                    shape_units[idx].append((main_unit, "parent"))
                    stats["parent"] += 1
    print(f"  Linked units: {stats['tagged']} tagged, {stats['inferred']} inferred, "
          f"{stats['untagged']} without a footprint, {stats['parent']} footprints shown via parent property.")
    report["unitLinkStats"] = dict(stats)
    return shape_units


def compact_tag(units, shape):
    """Short human label of the properties on a footprint, e.g. '562, 563' or '279 (38 units)'."""
    props = sorted({int(u["propertyNo"]) for u in units}) or sorted({p for p, _ in shape["claims"]})
    if not props:
        return "Untagged"  # footprint tagged '0' / empty in the shapefile
    label = ", ".join(str(p) for p in props[:6]) + (" ..." if len(props) > 6 else "")
    return label + (f" ({len(units)} units)" if len(units) > len(props) else "")


# ---------------------------------------------------------------------------
# 7. Ward / council outlines (convex hull of the footprints; no official boundary file exists)
# ---------------------------------------------------------------------------
def convex_hull(points):
    pts = sorted(set((round(p[0], 7), round(p[1], 7)) for p in points))
    if len(pts) <= 2:
        return [list(p) for p in pts]

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    return [list(p) for p in hull + [hull[0]]]


def polygon_feature(rings, props):
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": rings},
        "geometry_mercator": {"type": "Polygon",
                              "coordinates": [[to_mercator(x, y) for x, y in ring] for ring in rings]},
        "properties": props,
    }


def extent(points):
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    return [min(xs), min(ys), max(xs), max(ys)]


# ---------------------------------------------------------------------------
# 8. Main
# ---------------------------------------------------------------------------
UNIT_FIELDS = [
    "propertyId", "ownerID", "unitKey", "wardNo", "propertyNo", "partitionNo", "propertyNoOld",
    "propIdentifier", "ownerTitle", "ownerName", "ownerNameMarathi", "shopNo", "wingNo",
    "shopBuildingName", "ownerAddress", "ownerAddressMarathi", "description", "citySurveyGatNo",
    "buildupAreaSqMtr", "buildupAreaSqFt", "plotAreaSqMtr", "totalTaxOld", "propertyTaxOld",
    "rvOld", "assessedAmount", "paidAmount", "pendingAmount", "status", "contactNo",
    "waterConnection", "borewell", "solar", "rainwaterHarvesting", "lift", "isOpenPlot",
    "photos", "plans", "plan", "linkType",
]


def main():
    print("[Shahapur Data Builder] Indexing media...")
    unit_photos, range_photos = index_photos()
    unit_plans = index_plans()

    print("[Shahapur Data Builder] Reading Excel register...")
    records, by_key, by_prop = read_register(unit_photos, range_photos, unit_plans)

    # Media files whose (ward, prop, partition) is not in the register
    report["photosWithoutUnit"] = sorted(f for k, fs in unit_photos.items() if k not in by_key for f in fs)
    report["plansWithoutUnit"] = sorted(f for k, fs in unit_plans.items() if k not in by_key for f in fs)
    report["unitsWithoutPhoto"] = sum(1 for r in records if not r["photos"])
    report["unitsWithoutPlan"] = sum(1 for r in records if not r["plans"])

    print("[Shahapur Data Builder] Reading tagged footprints...")
    shapes = build_features()
    shape_units = link_units(shapes, by_prop)

    buildings, ward_points = [], defaultdict(list)
    for idx, s in enumerate(shapes):
        object_id = idx + 1
        linked = shape_units.get(idx, [])
        units = [u for u, _ in linked]
        for u, link in linked:
            if link != "parent":
                u["buildingIds"].append(object_id)
        ward_points[s["ward"]].extend(pt for ring in s["rings"] for pt in ring)

        outer = s["rings"][0]
        cx = round(sum(p[0] for p in outer) / len(outer), 7)
        cy = round(sum(p[1] for p in outer) / len(outer), 7)
        main = units[0] if units else None
        assessed = round(sum(u["assessedAmount"] for u in units), 2)
        props = sorted({int(u["propertyNo"]) for u in units})
        old_nos = [u["propertyNoOld"] for u in units if u["propertyNoOld"] and u["propertyNoOld"].upper() != "NEW"]

        buildings.append(polygon_feature(s["rings"], {
            "OBJECTID": object_id,
            "dbfObjectId": s["dbfObjectId"],
            "wardNo": str(s["ward"]),
            "propNo": compact_tag(units, s),
            "newPropNo": s["tag"],
            "matchedProps": [str(p) for p in props],
            "propertyNoOld": (f"{old_nos[0]} ... {old_nos[-1]}" if len(old_nos) > 1 else (old_nos[0] if old_nos else "")),
            "unitsCount": len(units),
            "ownerName": main["ownerName"] if main else "",
            "ownerNameMarathi": main["ownerNameMarathi"] if main else "",
            "buildingName": next((u["shopBuildingName"] for u in units if u["shopBuildingName"]), ""),
            "address": (main["ownerAddress"] or main["ownerAddressMarathi"]) if main else "",
            "description": main["description"] if main else "",
            "contactNo": main["contactNo"] if main else "",
            "totalAssessed": assessed,
            "totalPaid": 0.0,
            "totalPending": assessed,
            "status": ("Assessed" if assessed > 0 else "Unassessed") if units else "No register record",
            "centroid": [cx, cy],
            "centroid_mercator": to_mercator(cx, cy),
            # linkType per footprint: 'tagged' (named in newpropno), 'inferred' (truncated tag)
            # or 'parent' (structure of the property; register has no separate row for it)
            "units": [dict({k: u[k] for k in UNIT_FIELDS}, linkType=link) for u, link in linked],
        }))

    report["footprintsWithoutUnits"] = [
        {"ward": s["ward"], "dbfObjectId": s["dbfObjectId"], "tag": s["tag"]}
        for i, s in enumerate(shapes) if not shape_units.get(i)]
    report["propertiesWithoutFootprint"] = sorted(
        f"W{w}-{p}" for (w, p), us in by_prop.items() if not any(u["buildingIds"] for u in us))

    # Ward + council outlines
    ward_stats = defaultdict(lambda: defaultdict(float))
    for r in records:
        ws = ward_stats[r["wardNo"]]
        ws["totalProperties"] += 1
        ws["totalAssessed"] += r["assessedAmount"]
        ws["totalPending"] += r["pendingAmount"]
        ws["totalRateableValue"] += r["rvOld"]
        ws["assessedCount" if r["status"] == "Assessed" else "unassessedCount"] += 1

    ward_features, all_points = [], []
    for w in WARDS:
        pts = ward_points.get(w)
        if not pts:
            continue
        all_points.extend(pts)
        st = ward_stats[str(w)]
        ward_features.append(polygon_feature([convex_hull(pts)], {
            "OBJECTID": w,
            "Ward_No": str(w),
            "Ward_Name": f"Ward {w}",
            "totalBuildings": sum(1 for b in buildings if b["properties"]["wardNo"] == str(w)),
            "totalProperties": int(st["totalProperties"]),
            "totalAssessed": round(st["totalAssessed"], 2),
            "totalPaid": 0.0,
            "totalPending": round(st["totalPending"], 2),
            "totalRateableValue": round(st["totalRateableValue"], 2),
            "assessedCount": int(st["assessedCount"]),
            "unassessedCount": int(st["unassessedCount"]),
            "extent": extent(pts),
            "extent_mercator": extent([to_mercator(*p) for p in pts]),
        }))

    council = polygon_feature([convex_hull(all_points)], {
        "OBJECTID": 1, "Council_Name": "Shahapur Municipal Council", "District": "Thane",
        "Taluka": "Shahapur", "totalWards": len(ward_features),
        "totalProperties": len(records), "totalBuildings": len(buildings),
    })

    # Summary statistics (all derived from the register / footprints)
    descriptions, utilities = defaultdict(int), defaultdict(int)
    ward_usage = defaultdict(lambda: defaultdict(int))
    for r in records:
        descriptions[r["description"] or "Not recorded"] += 1
        ward_usage[r["wardNo"]][r["description"] or "Not recorded"] += 1
        for k in ("waterConnection", "borewell", "solar", "rainwaterHarvesting", "lift"):
            if r[k] == "Yes":
                utilities[k] += 1
    ward_utilities = {w: {k: sum(1 for r in records if r["wardNo"] == w and r[k] == "Yes")
                          for k in ("waterConnection", "borewell", "solar", "rainwaterHarvesting", "lift")}
                      for w in sorted(ward_stats)}
    total_assessed = round(sum(r["assessedAmount"] for r in records), 2)
    assessed_count = sum(1 for r in records if r["status"] == "Assessed")
    summary = {
        "totalProperties": len(records),
        "totalBuildings": len(buildings),
        "totalAssessed": total_assessed,
        "totalRateableValue": round(sum(r["rvOld"] for r in records), 2),
        "totalPaid": 0.0,
        "totalPending": total_assessed,
        "assessedPropertiesCount": assessed_count,
        "unassessedPropertiesCount": len(records) - assessed_count,
        "unitsWithPhoto": sum(1 for r in records if r["photos"]),
        "unitsWithPlan": sum(1 for r in records if r["plans"]),
        "unitsLinkedToFootprint": sum(1 for r in records if r["buildingIds"]),
        "wardTotals": {w: {k: (round(v, 2) if isinstance(v, float) else v) for k, v in st.items()}
                       for w, st in sorted(ward_stats.items())},
        "wardBuildings": {f["properties"]["Ward_No"]: f["properties"]["totalBuildings"] for f in ward_features},
        "wardUsage": {w: dict(v) for w, v in sorted(ward_usage.items())},
        "wardUtilities": ward_utilities,
        "descriptionCounts": dict(sorted(descriptions.items(), key=lambda kv: -kv[1])),
        "utilityCounts": {k: utilities[k] for k in ("waterConnection", "borewell", "solar", "rainwaterHarvesting", "lift")},
        "center": [73.3265, 19.4538],
        "extent": extent(all_points),
        "extent_mercator": extent([to_mercator(*p) for p in all_points]),
    }

    # Write outputs: <name>.js (loaded by app.html) + matching .json/.geojson (for other tools)
    outputs = {
        "taxRecordsData.js": ("SHAHAPUR_TAX_DATA", records, "taxRecords.json"),
        "buildingsData.js": ("SHAHAPUR_BUILDINGS_DATA", {"type": "FeatureCollection", "features": buildings}, "shahapur_buildings.geojson"),
        "wardsData.js": ("SHAHAPUR_WARDS_DATA", {"type": "FeatureCollection", "features": ward_features}, "shahapur_wards.geojson"),
        "councilData.js": ("SHAHAPUR_COUNCIL_DATA", {"type": "FeatureCollection", "features": [council]}, "shahapur_council.geojson"),
        "summaryStats.js": ("SHAHAPUR_SUMMARY_STATS", summary, "summaryStats.json"),
    }
    for js_name, (var, obj, json_name) in outputs.items():
        with open(os.path.join(OUTPUT_DIR, json_name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
        with open(os.path.join(OUTPUT_DIR, js_name), "w", encoding="utf-8") as f:
            f.write("// Autogenerated by scripts/build_data.py - do not edit by hand\n")
            f.write(f"window.{var} = ")
            json.dump(obj, f, ensure_ascii=False)
            f.write(";\n")

    report["summary"] = {k: summary[k] for k in (
        "totalProperties", "totalBuildings", "unitsWithPhoto", "unitsWithPlan", "unitsLinkedToFootprint")}
    with open(os.path.join(OUTPUT_DIR, "linkReport.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n[Shahapur Data Builder] Done.")
    for k, v in report["summary"].items():
        print(f"  {k}: {v}")
    print(f"  footprints without register units: {len(report['footprintsWithoutUnits'])}")
    print(f"  properties without footprint: {len(report['propertiesWithoutFootprint'])}")
    print(f"  photos without register unit: {len(report['photosWithoutUnit'])}")
    print(f"  warnings: {len(report['warnings'])}  (see data/linkReport.json)")


if __name__ == "__main__":
    main()
