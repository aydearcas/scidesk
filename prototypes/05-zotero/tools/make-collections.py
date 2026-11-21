"""Adds two collections to the TEST Zotero's database (private/zotero-data), with Zotero
closed: "Artrosis acelerada (prueba)" with 30 items, and inside it "Guía de la revista"
with the 6 examples of the journal guide. Neither the local API (read-only) nor the
connector can create collections, so this stands in for a user doing it by hand.
    python -I tools/make-collections.py
"""
import random
import sqlite3
import string
import sys
from pathlib import Path

db = Path(__file__).resolve().parent.parent / "private" / "zotero-data" / "zotero.sqlite"
if not db.exists():
    sys.exit(f"no test database at {db}")
c = sqlite3.connect(db)
key = lambda: "".join(random.choice("23456789ABCDEFGHIJKLMNPQRSTUVWXYZ") for _ in range(8))

# items by title (fieldName 'title')
rows = c.execute("""select i.itemID, v.value from items i
  join itemData d on d.itemID = i.itemID join fields f on f.fieldID = d.fieldID and f.fieldName = 'title'
  join itemDataValues v on v.valueID = d.valueID""").fetchall()
by_title = {t: i for i, t in rows}
guide_titles = ["The art of writing a scientific article", "The elements of style",
                "How to prepare an electronic version of your article", "Cancer statistics reports for the UK",
                "Mortality data for Japanese oak wilt disease and surrounding forest compositions"]
guide = [i for t, i in by_title.items() if t in guide_titles] + [i for i, t in rows if t == "The art of writing a scientific article"]
guide = sorted(set(guide))
others = sorted(i for i in by_title.values() if i not in guide)
main = guide + others[: 30 - len(guide)]

def add_collection(name, parent, items):
    cur = c.execute("insert into collections (collectionName, parentCollectionID, clientDateModified, libraryID, key, version, synced) values (?, ?, datetime('now'), 1, ?, 0, 0)", (name, parent, key()))
    cid = cur.lastrowid
    for n, i in enumerate(items):
        c.execute("insert into collectionItems (collectionID, itemID, orderIndex) values (?, ?, ?)", (cid, i, n))
    return cid

if c.execute("select count(*) from collections").fetchone()[0]:
    sys.exit("collections already there")
top = add_collection("Artrosis acelerada (prueba)", None, main)
add_collection("Guía de la revista", top, guide)
c.commit()
print({"collection": len(main), "subcollection": len(guide)})
