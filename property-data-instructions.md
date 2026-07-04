Property data CSVs

Files created under `data/`:
- `flats.csv` — sample rows for 6 flats
- `villas.csv` — sample rows for villas
- `plots.csv` — sample rows for 5 plots
- `farm-lands.csv` — sample rows for 2 farm land entries

How to convert to a single XLSX with tabs (Excel):

1. Open Microsoft Excel.
2. From the Data tab choose "Get Data" → "From Text/CSV" and import `flats.csv`.
3. Create a new worksheet and repeat for `villas.csv`, `plots.csv`, and `farm-lands.csv`.
4. Save the workbook as `property-data.xlsx`.

Quick command-line option (if you have Python and `openpyxl` installed):

```powershell
py -3 -m pip install openpyxl
py -3 -c "from openpyxl import Workbook; import csv
wb=Workbook(); wb.remove(wb.active)
for name in ['flats','villas','plots','farm-lands']:
    ws=wb.create_sheet(title=name)
    with open(f'data/{name}.csv',encoding='utf-8') as f:
        rows=list(csv.reader(f))
        for r in rows:
            ws.append(r)
wb.save('property-data.xlsx')"
```

How to keep editing:
- Add new rows to the appropriate CSV file under `data/`.
- If you prefer a single JSON source, I can add a small script to convert these CSVs into the `propertyCatalog` structure used in `js/property-data.js` automatically.

If you want, I can also attempt to generate `property-data.xlsx` directly from the environment—shall I try to create it now? (I may need Python available.)
