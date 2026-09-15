import sys, os, io, json, zipfile, hashlib
from pathlib import Path, PurePosixPath

def main():
    expected = sys.argv[1]
    if len(expected) != 64 or any(c not in '0123456789abcdef' for c in expected):
        raise ValueError('INVALID_ID')
    archive = sys.stdin.buffer.read(40 * 1024 * 1024 + 1)
    if len(archive) > 40 * 1024 * 1024:
        raise ValueError('SIZE_LIMIT')
    home = Path.home().resolve()
    base = home / 'ari-server/projects/k-stock-ai/windows-sync'
    for item in [base, *list(base.parents)[:-1]]:
        if item.is_symlink():
            raise ValueError('SYMLINK_REJECTED')
    base.mkdir(parents=True, exist_ok=True)
    snapshots = base / 'snapshots'
    if snapshots.is_symlink():
        raise ValueError('SYMLINK_REJECTED')
    snapshots.mkdir(exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        if sum(i.file_size for i in z.infolist()) > 33 * 1024 * 1024:
            raise ValueError('SIZE_LIMIT')
        manifest = json.loads(z.read('sync-manifest.json'))
        entries = manifest['entries']
        canonical = json.dumps(entries, ensure_ascii=False, separators=(',', ':')).encode()
        if hashlib.sha256(canonical).hexdigest() != expected or manifest['id'] != expected:
            raise ValueError('HASH_MISMATCH')
        names = [e['name'] for e in entries]
        if len(names) != len(set(names)) or sorted(z.namelist()) != sorted(names + ['sync-manifest.json']):
            raise ValueError('INVALID_MANIFEST')
        payload = []
        for e in entries:
            name = e['name']
            parts = PurePosixPath(name).parts
            if not parts or PurePosixPath(name).is_absolute() or '\\' in name or any(p in ('..', '.') or p.startswith('.') for p in parts):
                raise ValueError('INVALID_PATH')
            data = z.read(name)
            if len(data) != e['size'] or hashlib.sha256(data).hexdigest() != e['sha256']:
                raise ValueError('HASH_MISMATCH')
            payload.append((name, data))
        target = snapshots / expected
        if target.exists():
            if target.is_symlink() or not (target / 'sync-manifest.json').is_file():
                raise ValueError('EXISTING_SNAPSHOT_INVALID')
            for name, data in payload:
                f = target / name
                if f.is_symlink() or not f.resolve().is_relative_to(target.resolve()) or f.read_bytes() != data:
                    raise ValueError('EXISTING_SNAPSHOT_MODIFIED')
        else:
            if len(list(snapshots.iterdir())) >= 200:
                raise ValueError('SNAPSHOT_RETENTION_LIMIT')
            target.mkdir()
            for name, data in payload:
                f = target / name
                f.parent.mkdir(parents=True, exist_ok=True)
                with f.open('xb') as out:
                    out.write(data)
                if hashlib.sha256(f.read_bytes()).hexdigest() != hashlib.sha256(data).hexdigest():
                    raise ValueError('WRITE_VERIFY_FAILED')
            (target / 'sync-manifest.json').write_text(json.dumps(manifest), encoding='utf8')
        result = {'id': expected, 'files': len(entries), 'path': str(target)}
        temp = base / ('latest-' + str(os.getpid()) + '.json')
        with temp.open('x') as out:
            json.dump(result, out)
        os.replace(temp, base / 'latest.json')
        print(json.dumps(result))
try:
    main()
except Exception:
    print('SYNC_RECEIVER_FAILED', file=sys.stderr)
    sys.exit(1)
