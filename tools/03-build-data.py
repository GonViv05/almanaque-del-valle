#!/usr/bin/env python3
"""Genera ../data/data.js a partir de tools/.raw (archivos del juego ya desempaquetados)."""
import json, os, re, collections
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, '.raw'); ROOT = os.path.dirname(HERE)
def C(p): return json.load(open(os.path.join(RAW, p + '.json'), encoding='utf8'))['content']
def has(p): return os.path.exists(os.path.join(RAW, p + '.json'))
_str = {}
def strings(f):
    if f not in _str:
        d = dict(C('Strings/' + f)) if has('Strings/' + f) else {}
        if has(f'Strings/{f}.es-ES'): d.update(C(f'Strings/{f}.es-ES'))
        _str[f] = d
    return _str[f]
TOK = re.compile(r'\[LocalizedText Strings[\\/]+([^:\]]+):([^\s\]]+)((?:\s+[^\[\]]+|\s+\[[^\]]*\]+)*)\]')
def tr(s):
    if s is None: return None
    def rep(m):
        v = strings(m.group(1)).get(m.group(2), m.group(2)); args = re.findall(r'\[[^\]]*\]+|[^\s\[\]]+', m.group(3) or '')
        for i, a in enumerate(args): v = v.replace('{%d}' % i, '' if a.startswith('[') else a)
        return v
    for _ in range(4):
        n = TOK.sub(rep, s)
        if n == s: break
        s = n
    return re.sub(r'\[[A-Za-z]+Text[^\]]*\]', '', s).replace('\\n', '\n').strip()
OBJ = C('Data/Objects'); CROPS = C('Data/Crops'); FISH = C('Data/Fish'); LOC = C('Data/Locations'); SHOPS = C('Data/Shops'); MACH = C('Data/Machines')
ANI = C('Data/FarmAnimals'); BUILD = C('Data/Buildings'); CH = C('Data/Characters'); GIFT = C('Data/NPCGiftTastes'); GIFT_ES = C('Data/NPCGiftTastes.es-ES')
BUN = C('Data/Bundles.es-ES'); MON = C('Data/Monsters'); MON_ES = C('Data/Monsters.es-ES'); TREES = C('Data/FruitTrees'); GIANT = C('Data/GiantCrops'); RB = C('Data/RandomBundles'); BN = C('Strings/BundleNames.es-ES')
CRAFT = C('Data/CraftingRecipes'); COOK = C('Data/CookingRecipes'); BIG = C('Data/BigCraftables')
M = strings('StringsFromCSFiles'); LS = strings('Locations'); UI = strings('UI')
SEASON = ['Primavera', 'Verano', 'Otoño', 'Invierno']; SKEY = {'spring': 0, 'summer': 1, 'fall': 2, 'winter': 3}
CAT = {-75: 'Object.cs.12851', -4: 'Object.cs.12852', -7: 'Object.cs.12853', -79: 'Object.cs.12854', -74: 'Object.cs.12855', -19: 'Object.cs.12856', -21: 'Object.cs.12857', -22: 'Object.cs.12858', -20: 'Object.cs.12860', -26: 'Object.cs.12862', -8: 'Object.cs.12863', -5: 'Object.cs.12864', -6: 'Object.cs.12864', -18: 'Object.cs.12864', -14: 'Object.cs.12864', -80: 'Object.cs.12866', -28: 'Object.cs.12867', -15: 'Object.cs.12868', -16: 'Object.cs.12868', -81: 'Object.cs.12869', -2: 'Object.cs.12850', -12: 'Object.cs.12850', -27: 'Object.cs.12862', -23: 'Object.cs.12852'}
def catname(c): return M.get(CAT.get(c, ''), '')
def sheet(o):
    t = o.get('Texture'); i = o['SpriteIndex']
    if t and 'Objects_2' in t: return ['o2', (i % 8) * 16, (i // 8) * 16]
    return ['o', (i % 24) * 16, (i // 24) * 16]
def bare(i): return i[3:] if i and i.startswith('(O)') else i
objects = {}
for k, o in OBJ.items():
    objects[k] = dict(n=tr(o['DisplayName']) or o['Name'], en=o['Name'], d=tr(o['Description']) or '', p=o['Price'], c=o['Category'], cn=catname(o['Category']), e=o['Edibility'], s=sheet(o))
# ---------- tiendas
FEST = {'EggFestival': 'spring13', 'FlowerDance': 'spring24', 'Luau': 'summer11', 'DanceOfTheMoonlightJellies': 'summer28', 'StardewValleyFair': 'fall16', 'SpiritsEve': 'fall27', 'FestivalOfIce': 'winter8', 'FeastOfTheWinterStar': 'winter25'}
def festname(k):
    p = f'Data/Festivals/{FEST[k]}'
    return C(p).get('name', k) if has(p) else k
SHOPN = {'SeedShop': M['MapPage.cs.11078'], 'Joja': M['MapPage.cs.11105'], 'FishShop': M['MapPage.cs.11107'], 'Blacksmith': M['MapPage.cs.11081'], 'AnimalShop': M['MapPage.cs.11068'], 'Carpenter': M['MapPage.cs.11094'], 'Saloon': M['MapPage.cs.11172'], 'Sandy': 'Oasis', 'AdventureShop': M['MapPage.cs.11099'], 'Dwarf': 'Enano', 'ShadowShop': 'Krobus', 'IslandTrade': strings('WorldMap').get('GingerIsland_North_Trader', 'Comerciante Isleño'), 'Traveler': 'Carro ambulante', 'Hospital': M['MapPage.cs.11076'], 'Casino': 'Casino', 'ResortBar': 'Bar del centro turístico', 'VolcanoShop': 'Enano del volcán', 'QiGemShop': 'Sala de nueces de Qi', 'Bookseller': 'Librera', 'Raccoon': 'Mapache'}
for k in FEST: SHOPN[f'Festival_{k}_Pierre'] = festname(k)
SHOPN['Festival_StardewValleyFair_StarTokens'] = festname('StardewValleyFair')
SHOPN['Festival_FestivalOfIce_TravelingMerchant'] = festname('FestivalOfIce')
def cond(c):
    if not c: return []
    out = []
    for p in [x.strip() for x in c.split(',')]:
        m = p.split()
        if m[0] == 'SEASON': out.append({'season': [SKEY[x] for x in m[1:]]})
        elif m[0] == 'LOCATION_SEASON': out.append({'season': [SKEY[x] for x in m[2:] if x in SKEY]})
        elif m[0] == 'YEAR': out.append({'year': int(m[1])})
        elif m[0] == 'DAY_OF_WEEK': out.append({'dow': m[1:]})
        elif m[0] == 'WEATHER': out.append({'weather': m[2:]})
        elif p.startswith('!PLAYER_SPECIAL_ORDER_RULE_ACTIVE'): continue
        elif 'LEGENDARY_FAMILY' in p: out.append({'quest': 'family'})
        elif 'RANDOM' in m[0]: continue
        else: out.append({'other': p})
    return out
def mult(price, mods):
    for md in mods or []:
        if md.get('RandomAmount') or md.get('Condition') and not md['Condition'].startswith('!PLAYER_HAS_MAIL'): return None
        a = md['Amount']; op = md['Modification']
        price = {0: price + a, 1: price - a, 2: price * a, 3: price / a if a else price, 4: a}[op]
    return int(price)
sold = collections.defaultdict(list)
for sk, sh in SHOPS.items():
    if sk not in SHOPN: continue
    for it in sh['Items'] or []:
        ids = [it['ItemId']] if it.get('ItemId') else []
        ids += it.get('RandomItemId') or []
        for iid in ids:
            if not iid or not iid.startswith('(O)'): continue
            oid = iid[3:]
            if oid not in OBJ: continue
            base = it['Price'] if it.get('Price', -1) >= 0 else (OBJ[oid]['Price'] if it.get('UseObjectDataPrice') else OBJ[oid]['Price'] * 2)
            p = mult(base, it.get('PriceModifiers'))
            if p is not None and not it.get('IgnoreShopPriceModifiers') and sh.get('PriceModifiers'): p = mult(p, sh['PriceModifiers'])
            e = dict(shop=SHOPN[sk], key=sk, price=p, cond=cond(it.get('Condition')))
            if it.get('TradeItemId'):
                t = bare(it['TradeItemId']); e['trade'] = [t, it.get('TradeItemAmount', 1)]
                if not it.get('Price', -1) > 0: e['price'] = None
            if sh.get('Currency'): e['currency'] = sh['Currency']
            sold[oid].append(e)
# ---------- cultivos
HM = {0: 'mano', 1: 'hoz'}
crops = []
for seed, c in CROPS.items():
    h = c['HarvestItemId']
    if seed in ('495', '496', '497', '498', '770', '885') or h not in OBJ: continue
    o = OBJ[h]; ss = OBJ.get(seed)
    crops.append(dict(id=seed, item=h, name=tr(o['DisplayName']), seed=tr(ss['DisplayName']) if ss else seed, seasons=c['Seasons'], phases=c['DaysInPhase'], regrow=c['RegrowDays'], raised=c['IsRaised'], paddy=c['IsPaddyCrop'], water=c['NeedsWatering'],
        minH=c['HarvestMinStack'], maxH=c['HarvestMaxStack'], perLvl=c['HarvestMaxIncreasePerFarmingLevel'], extra=c['ExtraHarvestChance'], minQ=c['HarvestMinQuality'], method=HM.get(c['HarvestMethod'], 'mano'),
        price=o['Price'], cat=o['Category'], cn=catname(o['Category']), edible=o['Edibility'], sprite=c['SpriteIndex'], sheet=c['Texture'], giant=any((v.get('FromItemId') or '').endswith(h) for v in GIANT.values()), indoor=any('NotOutside' in (r.get('Id') or '') for r in c['PlantableLocationRules'] or []), sources=sold.get(seed, [])))
crops.sort(key=lambda c: (min(c['seasons'] or [9]), c['name']))
trees = []
for k, t in TREES.items():
    fr = [bare(f['ItemId']) for f in t['Fruit'] if f.get('ItemId')]; f0 = fr[0] if fr else None
    trees.append(dict(id=k, name=tr(t['DisplayName']), sapling=tr(OBJ[k]['DisplayName']), seasons=t['Seasons'], item=f0, price=OBJ[f0]['Price'] if f0 else 0, sources=sold.get(k, []), sprite=t.get('TextureSpriteRow', 0)))
# ---------- abonos
FERT = [('368', 'quality', 1), ('369', 'quality', 2), ('919', 'quality', 3), ('465', 'speed', .10), ('466', 'speed', .25), ('918', 'speed', .33), ('370', 'water', 1), ('371', 'water', 2), ('920', 'water', 3)]
fert = [dict(id=i, kind=k, val=v, name=tr(OBJ[i]['DisplayName']), desc=tr(OBJ[i]['Description']), sources=sold.get(i, [])) for i, k, v in FERT]
# ---------- peces
LN = {'Beach': M['MapPage.cs.11174'], 'Town': M['MapPage.cs.11190'], 'Forest': M['MapPage.cs.11186'], 'Mountain': M['MapPage.cs.11177'], 'Backwoods': M['MapPage.cs.11065'], 'Woods': M['MapPage.cs.11114'], 'Sewer': M['MapPage.cs.11089'], 'Desert': M['MapPage.cs.11062'], 'BugLand': 'Guarida del Bicho Mutante', 'WitchSwamp': 'Pantano de la Bruja', 'Submarine': 'Mercado Nocturno (submarino)', 'BeachNightMarket': 'Mercado Nocturno (muelle)', 'Caldera': 'Caldera del volcán', 'IslandNorth': 'Isla Jengibre (norte)', 'IslandSouth': 'Isla Jengibre (sur)', 'IslandSouthEast': 'Isla Jengibre (sureste)', 'IslandSouthEastCave': strings('WorldMap').get('GingerIsland_SouthEast_PirateCove', 'Cala Pirata'), 'IslandWest': 'Isla Jengibre (oeste)', 'UndergroundMine': M['MapPage.cs.11098'], 'Farm_Forest': 'Granja del bosque'}
AN = {'River': 'río', 'Lake': 'lago', 'Waterfall': 'cascada', 'Pond': 'estanque', 'Ocean': 'mar', 'Freshwater': 'agua dulce', 'TownRiver': 'río'}
BEH = {'mixed': 'Mixto', 'dart': 'Dardo', 'smooth': 'Suave', 'sinker': 'Hundido', 'floater': 'Flotante'}
# Qué estación vale en cada zona: la columna de Data/Fish no refleja lo que aparece en 1.6, manda Data/Locations.
ALL_S = [0, 1, 2, 3]; EVENT_ZONES = {'Submarine', 'BeachNightMarket'}
NON_SEASONAL = ('WEATHER', 'TIME', '!PLAYER_SPECIAL_ORDER_RULE_ACTIVE', 'PLAYER_SPECIAL_ORDER_RULE_ACTIVE')
def zone_seasons(f, ln, column):
    if ln in EVENT_ZONES: return [3]  # el Mercado Nocturno solo existe en invierno
    if f.get('Season') is not None: return [f['Season']]
    c = f.get('Condition') or ''
    m = re.search(r'(?<!!)LOCATION_SEASON\s+\w+\s+([a-z ]+)', c)
    if m: return sorted(SKEY[x] for x in m.group(1).split() if x in SKEY)
    other = [x.strip() for x in c.split(',') if x.strip() and not x.strip().startswith(NON_SEASONAL)]
    return (column or ALL_S) if other else ALL_S  # sin condición de estación, esa zona da todo el año
def fish_column(i):
    p = FISH[i].split('/')
    return [SKEY[x] for x in p[6].split() if x in SKEY] if len(p) > 6 and p[1] != 'trap' else []
where = collections.defaultdict(list)
for ln, l in LOC.items():
    if ln not in LN: continue
    for f in l['Fish'] or []:
        if f.get('RequireMagicBait'): continue  # el cebo mágico saca cualquier pez: no define dónde vive
        ids = [f['ItemId']] if f.get('ItemId') else []
        ids += f.get('RandomItemId') or []
        for iid in ids:
            i = bare(iid or '')
            if i in FISH:
                e = dict(loc=LN[ln], area=AN.get(f.get('FishAreaId'), f.get('FishAreaId')), ss=zone_seasons(f, ln, fish_column(i)), lvl=f.get('MinFishingLevel', 0), boss=bool(f.get('IsBossFish')), cond=cond(f.get('Condition')))
                e['quest'] = any(c.get('quest') for c in e['cond'])
                e['isl'] = ln.startswith('Island') or ln == 'Caldera'
                e['ev'] = ln in EVENT_ZONES
                if e not in where[i]: where[i].append(e)
fish = []
for k, v in FISH.items():
    p = v.split('/'); o = OBJ[k]
    if o['Category'] != -4: continue
    b = dict(id=k, name=tr(o['DisplayName']), en=o['Name'], desc=tr(o['Description']), price=o['Price'], s=sheet(o))
    if p[1] == 'trap': b.update(trap=True, water=p[4], chance=float(p[2]))
    else:
        t = [int(x) for x in p[5].split()]
        b.update(diff=int(p[1]), beh=BEH.get(p[2], p[2]), minS=int(p[3]), maxS=int(p[4]), times=[t[i:i + 2] for i in range(0, len(t), 2)], weather=p[7], lvl=int(p[12]), where=where.get(k, []))
        w_ = b['where']
        pick = [x for x in w_ if not (x['isl'] or x['ev'] or x['quest'])] or [x for x in w_ if x['quest']] or [x for x in w_ if x['ev']] or [x for x in w_ if x['isl']]
        b['seasons'] = sorted({s for x in pick for s in x['ss']}) or fish_column(k)
        b['legend'] = any(w['boss'] for w in b['where'])
    fish.append(b)
fish.sort(key=lambda f: (bool(f.get('trap')), f['name']))
# ---------- animales
aprods = collections.defaultdict(list)
animals = []
BN_ES = lambda b: tr(BUILD[b]['Name']) if b in BUILD else b
for k, a in ANI.items():
    prod = [dict(id=bare(x['ItemId']), f=x['MinimumFriendship']) for x in a['ProduceItemIds'] or []]
    dlx = [dict(id=bare(x['ItemId']), f=x['MinimumFriendship']) for x in a['DeluxeProduceItemIds'] or []]
    nm = tr(a['DisplayName']); nm = nm[0].upper() + nm[1:]
    for x in prod + dlx: aprods[x['id']].append(nm)
    animals.append(dict(id=k, name=nm, house=a['House'], houseN=BN_ES(a['RequiredBuilding'] or a['House']), req=a['RequiredBuilding'], reqN=BN_ES(a['RequiredBuilding']) if a['RequiredBuilding'] else None, buy=a['PurchasePrice'], sell=a['SellPrice'], mature=a['DaysToMature'], produce=a['DaysToProduce'], harvest=a['HarvestType'], tool=a['HarvestTool'], prod=prod, deluxe=dlx, eggs=[bare(e) for e in a['EggItemIds'] or []], incub=a['IncubationTime'], preg=a['CanGetPregnant'], tex=a['Texture'].split('\\')[-1], baby=(a['BabyTexture'] or '').split('\\')[-1] or None, w=a['SpriteWidth'], h=a['SpriteHeight'], desc=tr(a.get('ShopDescription')), unlock=a['UnlockCondition'], shopRect=a.get('ShopSourceRect'), shopTex=(a.get('ShopTexture') or '').split('\\')[-1]))
for a in animals:
    src_a = ANI[a['id']]
    for alt in src_a.get('AlternatePurchaseTypes') or []:
        for child in alt.get('AnimalIds') or []:
            for b in animals:
                if b['id'] == child and b['id'] != a['id'] and b['buy'] <= 0:
                    b['buy'] = a['buy']; b['viaBuy'] = a['name']
buildings = {k: dict(name=tr(b['Name']), cost=b['BuildCost'], days=b['BuildDays'], mats=[[bare(m['ItemId']), m['Amount']] for m in b['BuildMaterials'] or []], cap=b['MaxOccupants'], upgrade=b['BuildingToUpgrade'], desc=tr(b.get('Description'))) for k, b in BUILD.items() if k in ('Coop', 'Big Coop', 'Deluxe Coop', 'Barn', 'Big Barn', 'Deluxe Barn', 'Silo')}
inc = {k: [r.get('MinutesUntilReady') for r in MACH[k]['OutputRules']] for k in ('(BC)101', '(BC)254')}
# ---------- gustos (algoritmo NPC::getGiftTastesForThisItem, documentado en Modding:Gift taste data)
def ids(s): return [x for x in (s or '').split() if x]
U = {t: set(ids(GIFT['Universal_' + t])) for t in ('Love', 'Like', 'Neutral', 'Dislike', 'Hate')}
def taste(npc, oid, o, p):
    cat = str(o['Category']); T = 'neutral'; uni = False; uniN = False
    if cat != '0':
        for t, n in (('Love', 'love'), ('Hate', 'hate'), ('Like', 'like'), ('Dislike', 'dislike')):
            if cat in U[t]: T = n; break
    for t, n in (('Love', 'love'), ('Hate', 'hate'), ('Like', 'like'), ('Dislike', 'dislike'), ('Neutral', 'neutral')):
        if oid in U[t]:
            T = n; uni = True; uniN = t == 'Neutral'; break
    if T == 'neutral' and not uniN:
        if o['Edibility'] != -300 and o['Edibility'] < 0: T = 'hate'
        elif o['Price'] < 20: T = 'dislike'
    for n in ('love', 'hate', 'like', 'dislike', 'neutral'):
        s = p[n]
        if (oid in s or (cat != '0' and cat in s)) and (cat == '0' or cat not in s or not uni): return n
    return T
villagers = []
giftable = {k: o for k, o in OBJ.items() if o.get('CanBeGivenAsGift', True) and o['Category'] not in (0, -999) and o['Type'] not in ('Quest',) and 'Book_' not in k and o['Name'] != 'Weeds'}
SCHED_LOC = dict(LN); SCHED_LOC.update({k: tr(v['DisplayName']) for k, v in LOC.items() if v.get('DisplayName') and k not in LN and 'Farm' not in k})
SCHED_LOC.update({'SamHouse': M['MapPage.cs.11071'], 'JoshHouse': M['MapPage.cs.11092'], 'HaleyHouse': M['MapPage.cs.11073'], 'Hospital': M['MapPage.cs.11076'], 'HarveyRoom': M['MapPage.cs.11076'], 'SeedShop': M['MapPage.cs.11078'], 'ScienceHouse': M['MapPage.cs.11094'], 'SebastianRoom': M['MapPage.cs.11094'], 'AnimalShop': M['MapPage.cs.11068'], 'Trailer': M['MapPage.cs.11091'], 'ManorHouse': M['MapPage.cs.11085'], 'ArchaeologyHouse': M['MapPage.cs.11086'], 'LeahHouse': M['MapPage.cs.11070'], 'ElliottHouse': M['MapPage.cs.11088'], 'FishShop': M['MapPage.cs.11107'], 'CommunityCenter': M['MapPage.cs.11117'], 'JojaMart': M['MapPage.cs.11105'], 'Tent': M['MapPage.cs.11097'], 'Blacksmith': M['MapPage.cs.11081'], 'SandyHouse': 'Oasis', 'Railroad': M['MapPage.cs.11119'], 'BusStop': M['MapPage.cs.11066'], 'BathHouse_MensLocker': M['MapPage.cs.11110'], 'BathHouse_Entry': M['MapPage.cs.11110'], 'Saloon': M['MapPage.cs.11172'], 'Sunroom': M['MapPage.cs.11076'], 'LeoTreeHouse': 'Casa del árbol de Leo', 'IslandHut': 'Isla Jengibre (cabaña de Leo)', 'IslandEast': 'Isla Jengibre (este)', 'IslandShrine': 'Isla Jengibre (santuario)', 'WizardHouse': M['MapPage.cs.11067'], 'Mine': M['MapPage.cs.11098'], 'Sewer': M['MapPage.cs.11089'], 'SkullCave': 'Caverna de la Calavera', 'Club': 'Casino'})
DOW = {'Mon': 'Lunes', 'Tue': 'Martes', 'Wed': 'Miércoles', 'Thu': 'Jueves', 'Fri': 'Viernes', 'Sat': 'Sábado', 'Sun': 'Domingo'}
def sched_label(k):
    p = k.split('_'); out = []
    for x in p:
        if x in SKEY: out.append(SEASON[SKEY[x]])
        elif x in DOW: out.append(DOW[x])
        elif x == 'rain': out.append('Lluvia')
        elif x == 'rain2': out.append('Lluvia (alterno)')
        elif x.isdigit(): out.append(('día ' + x) if not out or not out[-1].startswith('día') else (x + '+ corazones'))
        else: out.append(x)
    return ' · '.join(out)
def sched_parse(s, table, seen=()):
    if s.startswith('GOTO'):
        t = s.split()[1]
        return sched_parse(table[t], table, seen + (t,)) if t in table and t not in seen else []
    rows = []; loc = None
    for seg in s.split('/'):
        p = seg.split()
        if not p or not re.match(r'^a?\d+$', p[0]):
            continue
        tm = int(p[0].lstrip('a'))
        if len(p) > 1 and not p[1].lstrip('-').isdigit() and p[1] != 'bed': loc = p[1]
        if p[1:2] == ['bed']: rows.append([tm, loc, 'bed']); continue
        rows.append([tm, loc, None])
    return rows
def hhmm(t): return (t // 100) * 60 + t % 100
for name in GIFT:
    if name.startswith('Universal') or name not in CH: continue
    c = CH[name]; g = GIFT[name].split('/'); ges = GIFT_ES.get(name, GIFT[name]).split('/')
    p = dict(love=set(ids(g[1])), like=set(ids(g[3])), dislike=set(ids(g[5])), hate=set(ids(g[7])), neutral=set(ids(g[9]) if len(g) > 9 else []))
    res = collections.defaultdict(list)
    for k, o in giftable.items(): res[taste(name, k, o, p)].append(k)
    sc = C(f'Characters/schedules/{name}') if has(f'Characters/schedules/{name}') else {}
    sch, tot = [], collections.Counter()
    for key, val in sc.items():
        if not isinstance(val, str) or key.startswith('marriage') or 'Festival' in key or key == 'GreenRain': continue
        rows = sched_parse(val, sc)
        if not rows: continue
        vis = [dict(t=r[0], loc=SCHED_LOC.get(r[1], r[1]) if r[1] else None, bed=r[2] == 'bed') for r in rows]
        sch.append(dict(key=key, label=sched_label(key), rows=vis))
        for a, b in zip(rows, rows[1:] + [[2200, None, None]]):
            if a[1] and a[2] != 'bed': tot[a[1]] += max(hhmm(b[0]) - hhmm(a[0]), 0)
    hl = (c['Home'] or [{}])[0].get('Location') if c.get('Home') else None
    zt = sum(tot.values()) or 1
    merged = collections.Counter(); homeN = SCHED_LOC.get(hl, hl)
    for k, v in tot.items(): merged[SCHED_LOC.get(k, k)] += v
    zones = [dict(k=n, n=n, pct=round(v * 100 / zt), home=n == homeN) for n, v in merged.most_common(8) if v * 100 / zt >= 2]
    from PIL import Image as _I
    _tex = c.get('TextureName') or name
    villagers.append(dict(id=name, tex=_tex, pw=_I.open(os.path.join(RAW, f'Portraits/{_tex}.png')).size[0], name=tr(c['DisplayName']) or name, bs=c['BirthSeason'], bd=c['BirthDay'], romance=c['CanBeRomanced'], home=SCHED_LOC.get(hl, hl), region=c['HomeRegion'], loved=sorted(p['love']), gift=dict(love=res['love'], like=res['like'], dislike=res['dislike'], hate=res['hate'], neutralN=len(res['neutral'])), personal={k: sorted(x for x in v if x in OBJ) for k, v in p.items()}, personalCats={k: sorted(x for x in v if x.lstrip('-').isdigit() and int(x) < 0) for k, v in p.items()}, quotes=dict(love=ges[0], like=ges[2], dislike=ges[4], hate=ges[6], neutral=ges[8] if len(ges) > 8 else ''), sched=sch, zones=zones))
villagers.sort(key=lambda v: v['name'])
# ---------- origen de cada ítem (para "cómo conseguirlo")
crop_of = {c['item']: c for c in crops}; tree_of = {t['item']: t for t in trees}; fish_of = {f['id']: f for f in fish}
forage = collections.defaultdict(list)
for ln, l in LOC.items():
    if ln not in LN and ln not in SCHED_LOC: continue
    for f in l['Forage'] or []:
        i = bare(f.get('ItemId') or '')
        if i in OBJ:
            e = [SCHED_LOC.get(ln, LN.get(ln, ln)), f.get('Season')]
            if e not in forage[i]: forage[i].append(e)
mach = collections.defaultdict(list)
for k, m in MACH.items():
    b = BIG.get(k.replace('(BC)', ''))
    if not b: continue
    for r in m['OutputRules'] or []:
        inp = [bare(t['RequiredItemId']) for t in r['Triggers'] if t.get('RequiredItemId')]
        for o in r['OutputItem'] or []:
            iid = o.get('ItemId') or ''
            fl = iid.split()
            oid = {'Wine': '348', 'Juice': '350', 'Jelly': '344', 'Pickle': '342', 'Roe': '812', 'AgedRoe': '447', 'Honey': '340'}.get(fl[1]) if iid.startswith('FLAVORED_ITEM') and len(fl) > 1 else bare(iid)
            if oid in OBJ:
                e = dict(m=tr(b['DisplayName']), inp=[x for x in inp if x in OBJ], min=r.get('MinutesUntilReady', -1))
                if e not in mach[oid]: mach[oid].append(e)
drops = collections.defaultdict(list)
for k, v in MON.items():
    d = v.split('/')[6].split()
    nm = MON_ES.get(k, v).split('/')[-1] or k
    for a in d[0::2]:
        if a in OBJ and nm not in drops[a]: drops[a].append(nm)
geo = collections.defaultdict(list)
for k, o in OBJ.items():
    for g in o.get('GeodeDrops') or []:
        for iid in ([g['ItemId']] if g.get('ItemId') else []) + (g.get('RandomItemId') or []):
            i = bare(iid)
            if i in OBJ and tr(o['DisplayName']) not in geo[i]: geo[i].append(tr(o['DisplayName']))
craft = {}
for rec, v in list(CRAFT.items()) + list(COOK.items()):
    p = v.split('/'); out = p[2].split()[0]
    if out in OBJ and len(p) > 3 and p[3 if rec in COOK else 3] != 'true':
        ing = p[0].split()
        craft[out] = dict(cook=rec in COOK, ing=[[ing[i], int(ing[i + 1])] for i in range(0, len(ing), 2)])
# Cuándo se puede conseguir cada ítem (para Perdibles): estaciones y fuentes que no dependen de la estación.
MANUAL_SEASONS = {'416': [3], '412': [3]}  # Ñame nival y Raíz invernal: salen arando en invierno, está en el código del juego
def availability(i):
    ss, always = set(), []
    if i in crop_of: ss |= set(crop_of[i]['seasons'])
    if i in tree_of: ss |= set(tree_of[i]['seasons'])
    if i in fish_of:
        f = fish_of[i]
        if f.get('trap'): always.append('nasa')
        else: ss |= set(f['seasons'])
    for _, se in forage.get(i, []): ss |= set(ALL_S) if se is None else {se}
    if mach.get(i): always.append('máquina')
    if aprods.get(i): always.append('animal')
    if drops.get(i): always.append('monstruo')
    if geo.get(i): always.append('geoda')
    if i in craft: always.append('receta')
    for e in sold.get(i, []):
        if e['key'].startswith('Festival_') or e['key'] == 'Traveler' or (e['price'] is None and not e.get('trade')): continue
        sc = [x for c in e['cond'] if c.get('season') for x in c['season']]
        if sc: ss |= set(sc)
        else: always.append('tienda')
    manual = i in MANUAL_SEASONS
    if manual: ss |= set(MANUAL_SEASONS[i])
    return dict(ss=sorted(ss), always=sorted(set(always)), manual=manual)
sources = {}
def src(i):
    if i in sources: return
    s = {}
    if i in crop_of: c = crop_of[i]; s['crop'] = dict(seed=c['id'], seasons=c['seasons'])
    if i in tree_of: s['tree'] = dict(id=tree_of[i]['id'], seasons=tree_of[i]['seasons'])
    if i in fish_of: s['fish'] = 1
    if forage.get(i): s['forage'] = forage[i][:10]
    if aprods.get(i): s['animal'] = sorted(set(aprods[i]))
    if mach.get(i): s['mach'] = mach[i][:3]
    if drops.get(i): s['mon'] = drops[i][:8]
    if geo.get(i): s['geo'] = geo[i][:6]
    if sold.get(i): s['shop'] = sold[i][:6]
    if i in craft: s['craft'] = craft[i]
    s['av'] = availability(i)
    sources[i] = s
# ---------- centro cívico
AREA = {'Pantry': 'Pantry', 'Crafts Room': 'CraftsRoom', 'Fish Tank': 'FishTank', 'Boiler Room': 'BoilerRoom', 'Vault': 'Vault', 'Bulletin Board': 'BulletinBoard', 'Abandoned Joja Mart': 'AbandonedJojaMart'}
RW = {'Pantry': 'Pantry', 'Crafts Room': 'Crafts', 'Fish Tank': 'FishTank', 'Boiler Room': 'Boiler', 'Vault': 'Vault', 'Bulletin Board': 'Bulletin'}
rooms = collections.OrderedDict()
def reward(r):
    p = r.split()
    if len(p) < 3: return None
    kind = {'O': 'o', 'BO': 'b', 'R': 'o', 'F': 'f'}.get(p[0], p[0]); rid = p[1]; n = int(p[2])
    if kind == 'b': b = BIG.get(rid); return dict(kind='b', id=rid, name=tr(b['DisplayName']) if b else rid, n=n, s=[int(rid) % 8 * 16, int(rid) // 8 * 32] if rid.isdigit() else None)
    return dict(kind='o', id=rid, name=objects[rid]['n'] if rid in objects else rid, n=n)
for k, v in BUN.items():
    a, bid = k.split('/'); p = v.split('/')
    r = p[2].split(); items = []
    for j in range(0, len(r), 3):
        if r[j] == '-1': items.append(dict(gold=int(r[j + 1])))
        else: src(r[j]); items.append(dict(id=r[j], n=int(r[j + 1]), q=int(r[j + 2])))
    slots = int(p[4]) if len(p) > 4 and p[4].strip() else len(items)
    if a not in rooms: rooms[a] = dict(id=a, name=LS.get('CommunityCenter_AreaName_' + AREA[a], a), reward=UI.get('JunimoNote_Reward' + RW.get(a, ''), '').replace('Recompensa: ', '').replace(' <', ''), bundles=[])
    rooms[a]['bundles'].append(dict(id=bid, en=p[0], name=p[6] if len(p) > 6 and p[6] else p[0], reward=reward(p[1]), items=items, slots=slots, color=int(p[3]) if p[3].strip().lstrip('-').isdigit() else 0))
name2id = {}
for k, o in OBJ.items(): name2id.setdefault(o['Name'], k)
remix = []
for a in RB:
    sets = []
    def conv(b):
        items = []
        for tok in [t.strip() for t in b['Items'].split(',')]:
            m = re.match(r'(\d+)\s+(?:\[(\w+)\]\s*)?(.+)', tok)
            if not m: continue
            n, q, nm = m.groups(); i = name2id.get(nm)
            if i: src(i)
            items.append(dict(id=i, name=objects[i]['n'] if i else nm, n=int(n), q={'SQ': 1, 'GQ': 2, 'IQ': 3}.get(q, 0)))
        return dict(name=BN.get(b['Name'], b['Name']), items=items, pick=b['Pick'], req=b['RequiredItems'], reward=b['Reward'])
    for s in a['BundleSets'] or []: sets.append([conv(b) for b in s['Bundles']])
    remix.append(dict(area=a['AreaName'], name=LS.get('CommunityCenter_AreaName_' + AREA.get(a['AreaName'], ''), a['AreaName']), sets=sets, random=[conv(b) for b in a.get('Bundles') or []]))
NOTES = json.load(open(os.path.join(HERE, 'notas-manuales.json'), encoding='utf8'))
for a in animals:
    for x in a['prod'] + a['deluxe']:
        if x['id'] in OBJ: src(x['id'])
for k, v in sources.items():
    key = k if k in NOTES else OBJ[k]['Name'] if OBJ[k]['Name'] in NOTES else None
    if key: v['note'] = NOTES[key]
MANUAL_WHERE = {'158': dict(loc=M['MapPage.cs.11098'], area='piso 20', ss=ALL_S, lvl=0, boss=False, cond=[], quest=False, isl=False, ev=False, manual=True), '161': dict(loc=M['MapPage.cs.11098'], area='piso 60', ss=ALL_S, lvl=0, boss=False, cond=[], quest=False, isl=False, ev=False, manual=True)}
for f in fish:
    if f['id'] in MANUAL_WHERE and not f.get('where'): f['where'] = [MANUAL_WHERE[f['id']]]
kegFixed = {}
for r in MACH['(BC)12']['OutputRules']:
    for t in r['Triggers']:
        o = bare((r['OutputItem'][0].get('ItemId') or ''))
        if t.get('RequiredItemId') and o in OBJ: kegFixed[bare(t['RequiredItemId'])] = dict(out=o, n=t.get('RequiredCount', 1), min=r['MinutesUntilReady'])
times = {k: {r['Id']: r['MinutesUntilReady'] for r in MACH[k]['OutputRules']} for k in ('(BC)12', '(BC)15', '(BC)Dehydrator')}
prof = {n: dict(name=UI.get('LevelUp_ProfessionName_' + n, n), desc=UI.get('LevelUp_ProfessionDescription_' + n, '')) for n in ('Tiller', 'Artisan', 'Agriculturist', 'Rancher', 'Coopmaster', 'Shepherd', 'Fisher', 'Angler')}
out = dict(meta=dict(version='1.6.15', lang='es'), objects=objects, crops=crops, trees=trees, fert=fert, fish=fish, animals=animals, buildings=buildings, incubators=inc, villagers=villagers, rooms=list(rooms.values()), remix=remix, sources=sources, prof=prof, seasons=SEASON, kegFixed=kegFixed, machineTimes=times)
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
js = 'window.SDV=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'data/data.js'), 'w', encoding='utf8').write(js)
print('data.js', len(js) // 1024, 'KB')
print('cultivos', len(crops), 'árboles', len(trees), 'peces', len(fish), 'animales', len(animals), 'aldeanos', len(villagers), 'salas', len(rooms), 'lotes', sum(len(r['bundles']) for r in rooms.values()))
print('sin zona de pesca:', [f['name'] for f in fish if not f.get('trap') and not f['where']])
print('sin precio de semilla:', [c['name'] for c in crops if not any(s['price'] for s in c['sources'])])
print('sin fuente (lotes):', [objects[k]['n'] for k, v in sources.items() if not v])
print('NPC sin agenda:', [v['name'] for v in villagers if not v['sched']])
print('zonas sin nombre:', sorted({z['n'] for v in villagers for z in v['zones'] if z['n'] == z['k']}))
