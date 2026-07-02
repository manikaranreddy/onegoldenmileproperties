#!/usr/bin/env python3
"""
Validate CSV files under data/ for required headers and duplicates.
Exits with code 1 on validation errors.
"""
import csv
import glob
import os
import re
import sys

REQUIRED_HEADERS = ['slug','title','propertyId','location','googleMaps','priceRange','availability','additionalDetails','highlights','image']

errors = []
seen_ids = {}
seen_slugs = {}

csv_files = sorted(glob.glob(os.path.join('data','*.csv')))
if not csv_files:
    print('No CSV files found in data/; nothing to validate.')
    sys.exit(0)

for path in csv_files:
    try:
        with open(path, newline='', encoding='utf-8') as fh:
            reader = csv.reader(fh)
            try:
                headers = next(reader)
            except StopIteration:
                errors.append(f'{path}: empty file')
                continue
            headers = [h.strip() for h in headers]
            header_idx = {h:i for i,h in enumerate(headers)}
            for req in ['slug','propertyId','title']:
                if req not in header_idx:
                    errors.append(f'{path}: missing required column "{req}"')
            rownum = 1
            for row in reader:
                rownum += 1
                # Normalize row length
                # Safely get field
                def g(col):
                    i = header_idx.get(col)
                    if i is None or i >= len(row):
                        return ''
                    return row[i].strip()
                slug = g('slug')
                pid = g('propertyId')
                title = g('title')
                if not slug:
                    errors.append(f'{path}:{rownum}: empty slug')
                else:
                    if slug in seen_slugs:
                        errors.append(f'{path}:{rownum}: duplicate slug "{slug}" (first seen in {seen_slugs[slug]})')
                    else:
                        seen_slugs[slug] = f'{path}:{rownum}'
                if not pid:
                    errors.append(f'{path}:{rownum}: empty propertyId')
                else:
                    if pid in seen_ids:
                        errors.append(f'{path}:{rownum}: duplicate propertyId "{pid}" (first seen in {seen_ids[pid]})')
                    else:
                        seen_ids[pid] = f'{path}:{rownum}'
                if not title:
                    errors.append(f'{path}:{rownum}: empty title')
                gm = g('googleMaps')
                if gm and not re.match(r'^https?://', gm):
                    errors.append(f'{path}:{rownum}: googleMaps not a valid URL: {gm}')
    except Exception as e:
        errors.append(f'Failed to read {path}: {e}')

if errors:
    print('\nCSV validation failed with the following errors:')
    for e in errors:
        print(' -', e)
    sys.exit(1)

print('CSV validation passed.')
sys.exit(0)
