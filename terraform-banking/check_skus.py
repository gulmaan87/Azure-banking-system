import sys, json
data = json.load(sys.stdin)
avail = [s for s in data if not s.get('restrictions')]
for s in sorted(avail, key=lambda x: x['name']):
    caps = {c['name']: c['value'] for c in s.get('capabilities', [])}
    vcpus = caps.get('vCPUs', '?')
    if vcpus == '1':
        print(f"{s['name']:40} vCPUs={vcpus}")
