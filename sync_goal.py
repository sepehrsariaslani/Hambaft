import pymysql

conn = pymysql.connect(
    host='db', user='_a339ad445e13c139', password='osDqTSqLuy036YV3',
    database='_a339ad445e13c139', charset='utf8mb4', autocommit=False
)
cur = conn.cursor()

cur.execute("SELECT fieldname, fieldtype FROM tabDocField WHERE parent='Hambaft Goal' AND fieldtype='Table'")
rows = cur.fetchall()
print(f"BEFORE: {len(rows)} Table fields")
for r in rows:
    print(f"  {r[0]}")

insert_sql = (
    "INSERT INTO tabDocField"
    " (name, parent, parenttype, fieldname, fieldtype, options, label, reqd, idx, hidden, in_list_view)"
    " VALUES (%(name)s, 'Hambaft Goal', 'DocType', %(fieldname)s, 'Table', %(options)s, %(label)s, 0, %(idx)s, 0, 0)"
)

cur.execute(insert_sql, dict(name='milestones-auto', fieldname='milestone', options='Hambaft Goal Milestone', label='مرا', idx=18))
cur.execute(insert_sql, dict(name='keyres-auto', fieldname='key_result', options='Hambaft Key Result', label='نتا', idx=19))
conn.commit()

cur.execute("SELECT fieldname FROM tabDocField WHERE parent='Hambaft Goal' AND fieldtype='Table'")
rows = cur.fetchall()
print(f"AFTER: {len(rows)} Table fields")
for r in rows:
    print(f"  {r[0]}")

cur.close()
conn.close()
print("Done")
