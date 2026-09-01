import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from jsonschema import Draft202012Validator, FormatChecker, RefResolver

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / 'data' / 'schemas'
CATALOG_DIR = ROOT / 'data' / 'catalogs'
CATALOGS = {
    'books': (CATALOG_DIR / 'books.json', SCHEMAS / 'book-catalog.schema.json', (8, 12)),
    'recipes': (CATALOG_DIR / 'recipes.json', SCHEMAS / 'recipe-catalog.schema.json', (24, 24)),
    'wines': (CATALOG_DIR / 'wines.json', SCHEMAS / 'wine-catalog.schema.json', (30, 30)),
}


def read_utf8_json(path):
    raw = path.read_bytes()
    raw.decode('utf-8')
    return json.loads(raw.decode('utf-8'))


def schema_errors(catalog_path, schema_path):
    data = read_utf8_json(catalog_path)
    schema = read_utf8_json(schema_path)
    resolver = RefResolver(base_uri=schema_path.parent.as_uri() + '/', referrer=schema)
    validator = Draft202012Validator(schema, resolver=resolver, format_checker=FormatChecker())
    errors = []
    for error in sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path)):
        pointer = '/' + '/'.join(map(str, error.absolute_path))
        errors.append({'path': pointer, 'message': error.message})
    return data, errors


def check_integrity(name, data, count_range):
    errors = []
    warnings = []
    generated_at = data.get('generatedAt')
    if generated_at:
        try:
            parsed_generated_at = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
            if parsed_generated_at > datetime.now(timezone.utc) + timedelta(minutes=5):
                warnings.append(f'generatedAt {generated_at} is more than five minutes in the future.')
        except ValueError:
            pass  # The JSON Schema format checker reports malformed timestamps.
    items = data.get('items', [])
    ids = [item.get('id') for item in items]
    if len(ids) != len(set(ids)):
        errors.append('IDs are not unique within the catalog.')
    if not (count_range[0] <= len(items) <= count_range[1]):
        errors.append(f'Record count {len(items)} is outside required range {count_range}.')
    for item in items:
        item_id = item.get('id', '<missing id>')
        source_ids = {source.get('sourceId') for source in item.get('sourceRefs', [])}
        for connection in item.get('themes', []) + item.get('themeConnections', []):
            for source_id in connection.get('sourceIds', []):
                if source_id not in source_ids:
                    errors.append(f'{item_id}: theme sourceId {source_id} does not resolve in the record.')
        if item.get('reviewStatus') != 'DRAFT':
            errors.append(f'{item_id}: reviewStatus is not DRAFT.')
        if 'image' in item or 'cover' in item:
            warnings.append(f'{item_id}: image/cover is present and needs rights review.')
        if 'estimatedCost' in item or 'estimatedPrice' in item:
            warnings.append(f'{item_id}: optional estimate is present and needs dated-source review.')
    if name == 'recipes':
        veg = sum('VEGETARIAN' in item.get('dietaryTags', []) for item in items)
        if veg < 8:
            errors.append(f'Only {veg} vegetarian records; at least 8 are required.')
        role_counts = {role: sum(role in item.get('courseRoles', []) for item in items) for role in ['STARTER','MAIN','SIDE','DESSERT']}
        if role_counts['STARTER'] < 8 or role_counts['DESSERT'] < 8 or role_counts['MAIN'] + role_counts['SIDE'] < 8:
            errors.append(f'Recipe course balance is insufficient: {role_counts}.')
    if name == 'wines':
        alcohol = sum(item.get('kind') == 'WINE' for item in items)
        zero = sum(item.get('kind') == 'ZERO_PROOF' for item in items)
        if alcohol != 20 or zero != 10:
            errors.append(f'Pairing balance is {alcohol} wine / {zero} zero-proof; required 20 / 10.')
    return errors, warnings


def probe_url(url):
    try:
        response = requests.get(url, timeout=15, allow_redirects=True, stream=True, headers={'User-Agent':'Mozilla/5.0 (compatible; SupperClubAICatalogValidator/1.0)'})
        status = response.status_code
        response.close()
        return url, status, 200 <= status < 400, ''
    except Exception as exc:
        return url, None, False, str(exc)


def source_urls(data):
    urls = []
    for item in data.get('items', []):
        for source in item.get('sourceRefs', []):
            urls.append(source['url'])
    return sorted(set(urls))


def main():
    report = {
        'generatedAt': datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'catalogs': {},
        'sourceUrlChecks': {'checked': 0, 'passed': 0, 'failed': []},
        'overallSchemaValid': True,
        'overallIntegrityValid': True,
    }
    all_urls = []
    for name, (catalog_path, schema_path, count_range) in CATALOGS.items():
        data, errors = schema_errors(catalog_path, schema_path)
        integrity_errors, warnings = check_integrity(name, data, count_range)
        report['catalogs'][name] = {
            'path': str(catalog_path),
            'recordCount': len(data.get('items', [])),
            'utf8Valid': True,
            'schemaValid': not errors,
            'schemaErrors': errors,
            'integrityValid': not integrity_errors,
            'integrityErrors': integrity_errors,
            'warnings': warnings,
            'missingOptionalFields': ['images/covers omitted intentionally', 'dated price estimates omitted intentionally']
        }
        report['overallSchemaValid'] = report['overallSchemaValid'] and not errors
        report['overallIntegrityValid'] = report['overallIntegrityValid'] and not integrity_errors
        all_urls.extend(source_urls(data))
    unique_urls = sorted(set(all_urls))
    report['sourceUrlChecks']['checked'] = len(unique_urls)
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(probe_url, url) for url in unique_urls]
        for future in as_completed(futures):
            url, status, ok, error = future.result()
            if ok:
                report['sourceUrlChecks']['passed'] += 1
            else:
                report['sourceUrlChecks']['failed'].append({'url': url, 'status': status, 'error': error})
    (CATALOG_DIR / 'validation_report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'schemaValid': report['overallSchemaValid'],
        'integrityValid': report['overallIntegrityValid'],
        'catalogCounts': {k: v['recordCount'] for k, v in report['catalogs'].items()},
        'sourceUrlsPassed': report['sourceUrlChecks']['passed'],
        'sourceUrlsChecked': report['sourceUrlChecks']['checked'],
        'sourceUrlsFailed': len(report['sourceUrlChecks']['failed'])
    }, indent=2))

if __name__ == '__main__':
    main()
