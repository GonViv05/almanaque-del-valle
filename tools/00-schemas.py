#!/usr/bin/env python3
"""Genera schemes.json leyendo los metadatos de StardewValley.GameData.dll (orden real de campos de tu versión).
Requiere: pip install dnfile. Uso: python 00-schemas.py "<carpeta del juego>/StardewValley.GameData.dll" schemes.json"""
import dnfile, sys, json
pe = dnfile.dnPE(sys.argv[1]); md = pe.net.mdtables
S = lambda x: str(x) if x is not None else ''
types = md.TypeDef.rows; refs = md.TypeRef.rows
def full(t): return (S(t.TypeNamespace) + '.' if S(t.TypeNamespace) else '') + S(t.TypeName)
nest = {n.NestedClass.row_index: n.EnclosingClass.row_index for n in (md.NestedClass.rows if md.NestedClass else [])}
def fullid(i):
    t = types[i]
    return fullid(nest[i + 1] - 1) + '+' + S(t.TypeName) if i + 1 in nest else full(t)
fullnames = [fullid(i) for i in range(len(types))]
idx = {n: i for i, n in enumerate(fullnames)}
def ext(t):
    e = t.Extends
    return full(e.row) if e is not None and e.row is not None and hasattr(e.row, 'TypeName') else ''
enums = {n for n, t in zip(fullnames, types) if ext(t) == 'System.Enum'}
def tok_name(tok):
    tbl = tok & 3; rid = tok >> 2
    if tbl == 0: return fullnames[rid - 1]
    if tbl == 1: return full(refs[rid - 1])
    raise ValueError('typespec')
class R:
    def __init__(s, b): s.b = b; s.i = 0
    def u(s):
        a = s.b[s.i]
        if a & 0x80 == 0: s.i += 1; return a
        if a & 0xC0 == 0x80: v = ((a & 0x3f) << 8) | s.b[s.i + 1]; s.i += 2; return v
        v = ((a & 0x1f) << 24) | (s.b[s.i + 1] << 16) | (s.b[s.i + 2] << 8) | s.b[s.i + 3]; s.i += 4; return v
    def typ(s):
        c = s.u()
        prim = {2: 'Boolean', 3: 'Char', 8: 'Int32', 9: 'UInt32', 0xa: 'Int64', 0xc: 'Single', 0xd: 'Double', 0xe: 'String', 0x1c: 'System.Object'}
        if c in prim: return {'k': 'p', 'n': prim[c], 'vt': c not in (0xe, 0x1c)}
        if c in (0x11, 0x12):
            n = tok_name(s.u()); return {'k': 'c', 'n': n, 'vt': c == 0x11}
        if c == 0x1d: return {'k': 'arr', 'e': s.typ(), 'vt': False}
        if c == 0x15:
            kind = s.u(); n = tok_name(s.u()); cnt = s.u(); a = [s.typ() for _ in range(cnt)]
            return {'k': 'g', 'n': n, 'a': a, 'vt': kind == 0x11}
        raise ValueError(hex(c))
def conv(t):
    if t['k'] == 'p': return t['n']
    if t['k'] == 'c':
        n = t['n']
        if n.startswith('Microsoft.Xna.Framework.'): return n.split('.')[-1]
        if t['vt'] and (n in enums or n.startswith('StardewValley')): return 'Int32'
        return n
    if t['k'] == 'arr': return [conv(t['e'])]
    if t['k'] == 'g':
        n = t['n']
        if n.startswith('System.Collections.Generic.List'): return [conv(t['a'][0])]
        if n.startswith('System.Collections.Generic.Dictionary'): return {conv(t['a'][0]) if isinstance(conv(t['a'][0]), str) else json.dumps(conv(t['a'][0])): conv(t['a'][1])}
        if n.startswith('System.Nullable'): return {'__nullable': conv(t['a'][0])}
    raise ValueError(t)
# atributos por (tabla, rid)
attrs = {}
for a in md.CustomAttribute.rows:
    p = a.Parent; tr = a.Type.row
    name = S(tr.Name) if not hasattr(tr, 'Class') else S(tr.Class.row.TypeName)
    attrs.setdefault((p.table.name if p.table is not None else '', p.row_index), set()).add(name)
FLD_PUBLIC = 6; FLD_ACCESS = 7; FLD_STATIC = 0x10; FLD_INIT = 0x20
def members(ti):
    t = types[ti]; out = []
    # propiedades primero (orden de MonoGame ReflectiveReader), luego campos
    props = []
    if md.PropertyMap:
        for pm in md.PropertyMap.rows:
            if pm.Parent.row_index == ti + 1:
                for pr in pm.PropertyList:
                    props.append(pr)
    meths = {S(m.row.Name): m.row for m in t.MethodList}
    for pr in props:
        p = pr.row; n = S(p.Name)
        g, s_ = meths.get('get_' + n), meths.get('set_' + n)
        if not g or not s_ or n == 'Item': continue
        if g.Flags.mdStatic: continue
        a = attrs.get(('Property', pr.row_index), set())
        if 'ContentSerializerIgnoreAttribute' in a: continue
        if 'ContentSerializerAttribute' not in a and not (g.Flags.mdPublic and s_.Flags.mdPublic): continue
        r = R(bytes(p.Type.value if hasattr(p.Type, 'value') else p.Type)); r.u(); r.u()  # flags, paramcount
        out.append((n, r.typ()))
    for fr in t.FieldList:
        f = fr.row; n = S(f.Name)
        fl = f.Flags
        if fl.fdStatic: continue
        a = attrs.get(('Field', fr.row_index), set())
        if 'ContentSerializerIgnoreAttribute' in a: continue
        if 'ContentSerializerAttribute' not in a:
            if not fl.fdPublic or fl.fdInitOnly: continue
        r = R(bytes(f.Signature.value if hasattr(f.Signature, 'value') else f.Signature)); r.u()
        out.append((n.replace('Impl', '') if n.endswith('Impl') else n, r.typ()))
    return out
schemes = {}
def flat(ti):
    t = types[ti]; b = ext(t); res = []
    if b in idx: res += flat(idx[b])
    return res + members(ti)
for i, n in enumerate(fullnames):
    if not n.startswith('StardewValley') or '<' in n or n in enums: continue
    if ext(types[i]) in ('System.Enum', 'System.ValueType', 'System.Attribute'): continue
    sch = {}
    try:
        for name, ty in flat(i):
            c = conv(ty)
            if isinstance(c, dict) and '__nullable' in c: sch['$' + name] = c['__nullable']
            elif ty['vt']: sch[name] = c
            else: sch['$' + name] = c
    except Exception as e:
        print('skip', n, e); continue
    schemes[n] = sch
json.dump({'schemes': schemes, 'enums': sorted(enums)}, open(sys.argv[2], 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print(len(schemes), 'schemes', len(enums), 'enums')
print(json.dumps(schemes['StardewValley.GameData.Objects.ObjectBuffData'], ensure_ascii=False))
