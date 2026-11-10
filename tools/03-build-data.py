#!/usr/bin/env python3
"""Genera ../data/data.js (español) o ../data/data.en.js (inglés, con --lang en) a partir de tools/.raw
(archivos del juego ya desempaquetados). Los textos salen de los archivos del juego en ese idioma."""
import json, os, re, collections, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, '.raw'); ROOT = os.path.dirname(HERE)
_ap = argparse.ArgumentParser(); _ap.add_argument('--lang', choices=('es', 'en'), default='es'); LANG = _ap.parse_args().lang
EN = LANG == 'en'; SUF = '' if EN else '.es-ES'
def tx(es, en): return en if EN else es  # textos propios del almanaque (los del juego salen de sus archivos)
def C(p): return json.load(open(os.path.join(RAW, p + '.json'), encoding='utf8'))['content']
def has(p): return os.path.exists(os.path.join(RAW, p + '.json'))
def CL(p): return C(p + SUF) if has(p + SUF) else C(p)  # la versión del idioma elegido, o la original
_str = {}
def strings(f):
    if f not in _str:
        d = dict(C('Strings/' + f)) if has('Strings/' + f) else {}
        if not EN and has(f'Strings/{f}.es-ES'): d.update(C(f'Strings/{f}.es-ES'))
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
ANI = C('Data/FarmAnimals'); BUILD = C('Data/Buildings'); CH = C('Data/Characters'); GIFT = C('Data/NPCGiftTastes'); GIFT_ES = CL('Data/NPCGiftTastes')
BUN = CL('Data/Bundles'); MON = C('Data/Monsters'); MON_ES = CL('Data/Monsters'); TREES = C('Data/FruitTrees'); GIANT = C('Data/GiantCrops'); RB = C('Data/RandomBundles'); BN = CL('Strings/BundleNames')
CRAFT = C('Data/CraftingRecipes'); COOK = C('Data/CookingRecipes'); BIG = C('Data/BigCraftables')
M = strings('StringsFromCSFiles'); LS = strings('Locations'); UI = strings('UI')
SEASON = [tx('Primavera', 'Spring'), tx('Verano', 'Summer'), tx('Otoño', 'Fall'), tx('Invierno', 'Winter')]; SKEY = {'spring': 0, 'summer': 1, 'fall': 2, 'winter': 3}
CAT = {-75: 'Object.cs.12851', -4: 'Object.cs.12852', -7: 'Object.cs.12853', -79: 'Object.cs.12854', -74: 'Object.cs.12855', -19: 'Object.cs.12856', -21: 'Object.cs.12857', -22: 'Object.cs.12858', -20: 'Object.cs.12860', -26: 'Object.cs.12862', -8: 'Object.cs.12863', -5: 'Object.cs.12864', -6: 'Object.cs.12864', -18: 'Object.cs.12864', -14: 'Object.cs.12864', -80: 'Object.cs.12866', -28: 'Object.cs.12867', -15: 'Object.cs.12868', -16: 'Object.cs.12868', -81: 'Object.cs.12869', -2: 'Object.cs.12850', -12: 'Object.cs.12850', -27: 'Object.cs.12862', -23: 'Object.cs.12852'}
def catname(c): return M.get(CAT.get(c, ''), '')
def sheet(o):
    t = o.get('Texture'); i = o['SpriteIndex']
    if t and 'Objects_2' in t: return ['o2', (i % 8) * 16, (i // 8) * 16]
    return ['o', (i % 24) * 16, (i // 24) * 16]
def bare(i): return i[3:] if i and i.startswith('(O)') else i
objects = {}
# Grupo de la pestaña Objetos: la categoría que muestra el juego, o el tipo cuando la categoría viene vacía.
GRUPO = {'Ring': M['Ring.cs.1'], 'Arch': M['Object.cs.12849'], 'Minerals': M['Object.cs.12850']}
def grupo(o):
    if o['Type'] in GRUPO: return GRUPO[o['Type']]
    if o['Category'] in (-102, -103): return strings('1_6_Strings').get('Book_Category', tx('Libro', 'Book'))
    if o['Category'] == -24: return M['Object.cs.12859']
    return catname(o['Category']) or tx('Otros', 'Other')
for k, o in OBJ.items():
    n = tr(o['DisplayName']) or o['Name']; tags = o.get('ContextTags') or []
    objects[k] = e = dict(n=n, en=o['Name'], d=tr(o['Description']) or '', p=o['Price'], c=o['Category'], cn=catname(o['Category']), e=o['Edibility'], s=sheet(o), g=grupo(o))
    # Lo que nunca llega a la mochila (piedras y hierbajos del suelo, puntos de excavación) o no tiene nombre traducido.
    if o['Type'] in ('Litter', 'interactive') or k in ('590', 'SeedSpot', '449') or n == '???' or (n == o['Name'] and re.search(r'_|[a-z][A-Z]', n)): e['x'] = 1
    # Como LibraryMuseum.IsItemSuitableForDonation: artefactos y minerales, salvo los marcados.
    if (o['Type'] in ('Arch', 'Minerals') or 'museum_donatable' in tags) and 'not_museum_donatable' not in tags: e['mu'] = 1
    bs = [dict(at={a: v for a, v in (b.get('CustomAttributes') or {}).items() if v}, min=b.get('Duration', 0)) for b in o.get('Buffs') or []]
    if any(b['at'] for b in bs): e['bf'] = [b for b in bs if b['at']]
# ---------- tiendas
FEST = {'EggFestival': 'spring13', 'FlowerDance': 'spring24', 'Luau': 'summer11', 'DanceOfTheMoonlightJellies': 'summer28', 'StardewValleyFair': 'fall16', 'SpiritsEve': 'fall27', 'FestivalOfIce': 'winter8', 'FeastOfTheWinterStar': 'winter25'}
def festname(k):
    for p in (f'Data/Festivals/{FEST[k]}{SUF}', f'Data/Festivals/{FEST[k]}'):
        if has(p): return C(p).get('name', k)
    return k
SHOPN = {'SeedShop': M['MapPage.cs.11078'], 'Joja': M['MapPage.cs.11105'], 'FishShop': M['MapPage.cs.11107'], 'Blacksmith': M['MapPage.cs.11081'], 'AnimalShop': M['MapPage.cs.11068'], 'Carpenter': M['MapPage.cs.11094'], 'Saloon': M['MapPage.cs.11172'], 'Sandy': 'Oasis', 'AdventureShop': M['MapPage.cs.11099'], 'Dwarf': tx('Enano', 'Dwarf'), 'ShadowShop': 'Krobus', 'IslandTrade': strings('WorldMap').get('GingerIsland_North_Trader', tx('Comerciante Isleño', 'Island Trader')), 'Traveler': tx('Carro ambulante', 'Traveling Cart'), 'Hospital': M['MapPage.cs.11076'], 'Casino': 'Casino', 'ResortBar': tx('Bar del centro turístico', 'Island Resort Bar'), 'VolcanoShop': tx('Enano del volcán', 'Volcano Dwarf'), 'QiGemShop': tx('Sala de nueces de Qi', "Qi's Walnut Room"), 'Bookseller': tx('Librera', 'Bookseller'), 'Raccoon': tx('Mapache', 'Raccoon')}
for k in FEST: SHOPN[f'Festival_{k}_Pierre'] = festname(k)
SHOPN['Festival_StardewValleyFair_StarTokens'] = festname('StardewValleyFair')
SHOPN['Festival_FestivalOfIce_TravelingMerchant'] = festname('FestivalOfIce')
ACH = CL('Data/Achievements')
SKILLK = {'FARMING': 'Farmer.cs.1991', 'MINING': 'Farmer.cs.1992', 'FISHING': 'Farmer.cs.1993', 'FORAGING': 'Farmer.cs.1994', 'COMBAT': 'Farmer.cs.1996'}
def cond(c):
    if not c: return []
    out = []
    for p in [x.strip() for x in c.split(',')]:
        m = p.split()
        if not m: continue
        if m[0] == 'SEASON': out.append({'season': [SKEY[x] for x in m[1:]]})
        elif m[0] == 'LOCATION_SEASON': out.append({'season': [SKEY[x] for x in m[2:] if x in SKEY]})
        elif m[0] == 'YEAR': out.append({'year': int(m[1])})
        elif m[0] == '!YEAR' and m[1] == '2': out.append({'year1': 1})
        elif m[0] == 'DAY_OF_WEEK': out.append({'dow': m[1:]})
        elif m[0] == 'DAY_OF_MONTH': out.append({'dom': m[1:]})
        elif m[0] == 'MINE_LOWEST_LEVEL_REACHED': out.append({'mine': int(m[1])})
        elif m[0] == 'PLAYER_HAS_ACHIEVEMENT' and str(m[2]) in ACH: out.append({'ach': ACH[str(m[2])].split('^')[0]})
        elif m[0] == 'PLAYER_HAS_ALL_ACHIEVEMENTS': out.append({'ach': '*'})
        elif m[0] == 'PLAYER_FARMHOUSE_UPGRADE': out.append({'house': int(m[2])})
        elif m[0] == 'MUSEUM_DONATIONS': out.append({'museum': int(m[1]), 'types': m[2:]})
        elif re.fullmatch(r'PLAYER_BASE_(\w+)_LEVEL', m[0]) and m[0][12:-6] in SKILLK: out.append({'skill': [M[SKILLK[m[0][12:-6]]], int(m[2])]})
        elif m[0] == 'PLAYER_HEARTS' and len(m) > 3: out.append({'hearts': [tr(CH[m[2]]['DisplayName']) if m[2] in CH else m[2], int(m[3])]})
        elif m[0] == 'DAYS_PLAYED': out.append({'days': int(m[1])})
        elif p == 'PLAYER_HAS_MAIL Current galaxySword': out.append({'tras': tr(C('Data/Weapons')['4']['DisplayName'])})  # la carta se marca al conseguir la espada
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
HM = {0: tx('mano', 'hand'), 1: tx('hoz', 'scythe')}
crops = []
for seed, c in CROPS.items():
    h = c['HarvestItemId']
    if seed in ('495', '496', '497', '498', '770', '885') or h not in OBJ: continue
    o = OBJ[h]; ss = OBJ.get(seed)
    crops.append(dict(id=seed, item=h, name=tr(o['DisplayName']), seed=tr(ss['DisplayName']) if ss else seed, seasons=c['Seasons'], phases=c['DaysInPhase'], regrow=c['RegrowDays'], raised=c['IsRaised'], paddy=c['IsPaddyCrop'], water=c['NeedsWatering'],
        minH=c['HarvestMinStack'], maxH=c['HarvestMaxStack'], perLvl=c['HarvestMaxIncreasePerFarmingLevel'], extra=c['ExtraHarvestChance'], minQ=c['HarvestMinQuality'], method=HM.get(c['HarvestMethod'], HM[0]),
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
LN = {'Beach': M['MapPage.cs.11174'], 'Town': M['MapPage.cs.11190'], 'Forest': M['MapPage.cs.11186'], 'Mountain': M['MapPage.cs.11177'], 'Backwoods': M['MapPage.cs.11065'], 'Woods': M['MapPage.cs.11114'], 'Sewer': M['MapPage.cs.11089'], 'Desert': M['MapPage.cs.11062'], 'BugLand': tx('Guarida del Bicho Mutante', 'Mutant Bug Lair'), 'WitchSwamp': tx('Pantano de la Bruja', "Witch's Swamp"), 'Submarine': tx('Mercado Nocturno (submarino)', 'Night Market (submarine)'), 'BeachNightMarket': tx('Mercado Nocturno (muelle)', 'Night Market (dock)'), 'Caldera': tx('Caldera del volcán', 'Volcano Caldera'), 'IslandNorth': tx('Isla Jengibre (norte)', 'Ginger Island (north)'), 'IslandSouth': tx('Isla Jengibre (sur)', 'Ginger Island (south)'), 'IslandSouthEast': tx('Isla Jengibre (sureste)', 'Ginger Island (southeast)'), 'IslandSouthEastCave': strings('WorldMap').get('GingerIsland_SouthEast_PirateCove', tx('Cala Pirata', 'Pirate Cove')), 'IslandWest': tx('Isla Jengibre (oeste)', 'Ginger Island (west)'), 'UndergroundMine': M['MapPage.cs.11098'], 'Farm_Forest': tx('Granja del bosque', 'Forest Farm')}
AN = {'River': tx('río', 'river'), 'Lake': tx('lago', 'lake'), 'Waterfall': tx('cascada', 'waterfall'), 'Pond': tx('estanque', 'pond'), 'Ocean': tx('mar', 'ocean'), 'Freshwater': tx('agua dulce', 'freshwater'), 'TownRiver': tx('río', 'river')}
BEH = {'mixed': tx('Mixto', 'Mixed'), 'dart': tx('Dardo', 'Dart'), 'smooth': tx('Suave', 'Smooth'), 'sinker': tx('Hundido', 'Sinker'), 'floater': tx('Flotante', 'Floater')}
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
SCHED_LOC.update({'SamHouse': M['MapPage.cs.11071'], 'JoshHouse': M['MapPage.cs.11092'], 'HaleyHouse': M['MapPage.cs.11073'], 'Hospital': M['MapPage.cs.11076'], 'HarveyRoom': M['MapPage.cs.11076'], 'SeedShop': M['MapPage.cs.11078'], 'ScienceHouse': M['MapPage.cs.11094'], 'SebastianRoom': M['MapPage.cs.11094'], 'AnimalShop': M['MapPage.cs.11068'], 'Trailer': M['MapPage.cs.11091'], 'ManorHouse': M['MapPage.cs.11085'], 'ArchaeologyHouse': M['MapPage.cs.11086'], 'LeahHouse': M['MapPage.cs.11070'], 'ElliottHouse': M['MapPage.cs.11088'], 'FishShop': M['MapPage.cs.11107'], 'CommunityCenter': M['MapPage.cs.11117'], 'JojaMart': M['MapPage.cs.11105'], 'Tent': M['MapPage.cs.11097'], 'Blacksmith': M['MapPage.cs.11081'], 'SandyHouse': 'Oasis', 'Railroad': M['MapPage.cs.11119'], 'BusStop': M['MapPage.cs.11066'], 'BathHouse_MensLocker': M['MapPage.cs.11110'], 'BathHouse_Entry': M['MapPage.cs.11110'], 'Saloon': M['MapPage.cs.11172'], 'Sunroom': M['MapPage.cs.11078'], 'LeoTreeHouse': tx('Casa del árbol de Leo', "Leo's Treehouse"), 'IslandHut': tx('Isla Jengibre (cabaña de Leo)', "Ginger Island (Leo's hut)"), 'IslandEast': tx('Isla Jengibre (este)', 'Ginger Island (east)'), 'IslandShrine': tx('Isla Jengibre (santuario)', 'Ginger Island (shrine)'), 'WizardHouse': M['MapPage.cs.11067'], 'Mine': M['MapPage.cs.11098'], 'Sewer': M['MapPage.cs.11089'], 'SkullCave': tx('Caverna de la Calavera', 'Skull Cavern'), 'Club': 'Casino'})
DOW = {'Mon': tx('Lunes', 'Monday'), 'Tue': tx('Martes', 'Tuesday'), 'Wed': tx('Miércoles', 'Wednesday'), 'Thu': tx('Jueves', 'Thursday'), 'Fri': tx('Viernes', 'Friday'), 'Sat': tx('Sábado', 'Saturday'), 'Sun': tx('Domingo', 'Sunday')}
def sched_label(k):
    p = k.split('_'); out = []
    for x in p:
        if x in SKEY: out.append(SEASON[SKEY[x]])
        elif x in DOW: out.append(DOW[x])
        elif x == 'rain': out.append(tx('Lluvia', 'Rain'))
        elif x == 'rain2': out.append(tx('Lluvia (alterno)', 'Rain (alternate)'))
        elif x.isdigit(): out.append((tx('día ', 'day ') + x) if not out or not out[-1].startswith(tx('día', 'day')) else (x + tx('+ corazones', '+ hearts')))
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
# Sangrador: lo que da cada árbol silvestre está en Data/WildTrees, no en Data/Machines.
tap = collections.defaultdict(list)
for k, t in C('Data/WildTrees').items():
    seed = bare(t.get('SeedItemId') or '')
    for x in t.get('TapItems') or []:
        i = bare(x.get('ItemId') or '')
        if i in OBJ and seed in OBJ:
            nw = 'Winter' in (x.get('Condition') or '').title()
            prev = next((e for e in tap[i] if e['seed'] == seed and e['days'] == x.get('DaysUntilReady', 0)), None)
            if prev: prev['noWinter'] = prev['noWinter'] and nw  # alguna regla sin condición: también en invierno
            else: tap[i].append(dict(seed=seed, days=x.get('DaysUntilReady', 0), noWinter=nw))
TAPPER = tr(BIG['105']['DisplayName']) if '105' in BIG else tx('Sangrador', 'Tapper')
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
    if tap.get(i): always.append('sangrador')
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
    if tap.get(i): s['tap'] = tap[i]
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
    if a not in rooms: rooms[a] = dict(id=a, name=LS.get('CommunityCenter_AreaName_' + AREA[a], a), reward=re.sub(r'^(Recompensa|Reward): ', '', UI.get('JunimoNote_Reward' + RW.get(a, ''), '')).replace(' <', ''), bundles=[])
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
NOTES = json.load(open(os.path.join(HERE, 'notas-manuales.en.json' if EN else 'notas-manuales.json'), encoding='utf8'))
# ---------- recetas de fabricación y cocina: ingredientes y cómo se aprende cada una, todo desde los datos
SKILL = {'Farming': M['Farmer.cs.1991'], 'Mining': M['Farmer.cs.1992'], 'Fishing': M['Farmer.cs.1993'], 'Foraging': M['Farmer.cs.1994'], 'Combat': M['Farmer.cs.1996'], 'Luck': tx('Suerte', 'Luck')}
NPCN = {k: tr(v['DisplayName']) or k for k, v in CH.items()}
TV = {v.split('/')[0]: int(k) for k, v in CL('Data/TV/CookingChannel').items()} if has('Data/TV/CookingChannel' + SUF) or has('Data/TV/CookingChannel') else {}
SOS = strings('SpecialOrderStrings')
def so_text(s): return re.sub(r'\[([^\]]+)\]', lambda m: SOS.get(m.group(1), m.group(1)), s or '')
recipe_mail = {}  # carta -> receta que trae
for k, v in C('Data/mail').items():
    m = re.search(r'%item (?:crafting|cooking)Recipe ([^%]+?) ?%%', v)
    if m: recipe_mail[k] = m.group(1).replace('_', ' ')
recipe_how = collections.defaultdict(list)
for k, o in C('Data/SpecialOrders').items():
    for r in o.get('Rewards') or []:
        mk = (r.get('Data') or {}).get('MailReceived') if r.get('Type') == 'Mail' else None
        if mk in recipe_mail: recipe_how[recipe_mail[mk]].append(dict(k='order', npc=NPCN.get(o['Requester'], o['Requester']), name=so_text(o['Name'])))
EVLOC = {'Farm': tx('la granja', 'the farm'), 'Beach': LN['Beach'], 'Mountain': LN['Mountain'], 'JoshHouse': M['MapPage.cs.11092'], 'ScienceHouse': M['MapPage.cs.11094'], 'Sunroom': M['MapPage.cs.11078']}
for f in sorted(os.listdir(os.path.join(RAW, 'Data/Events'))):
    loc = f.split('.')[0]
    if EN and f.endswith('.es-ES.json'): continue
    if not EN and not f.endswith('.es-ES.json') and has(f'Data/Events/{loc}.es-ES'): continue
    if f.count('.') > 1 and not f.endswith(SUF + '.json'): continue  # otros idiomas del juego
    for k, v in C('Data/Events/' + f[:-5]).items():
        names = re.findall(r'add(?:Crafting|Cooking)Recipe ([^/"]+)', v)
        mails = [m for m in re.findall(r'(?:addMailReceived|mail(?:Received)?)\s+(\w+)', v) if m in recipe_mail]
        if not names and not mails: continue
        pre = k.split('/')[1:]
        fr = [(NPCN.get(p.split()[1], p.split()[1]), int(p.split()[2]) // 250) for p in pre if p.startswith('f ') and len(p.split()) > 2]
        for n in names + [recipe_mail[m] for m in mails]:
            e = dict(k='event', loc=EVLOC.get(loc, SCHED_LOC.get(loc, loc)), npc=fr[0][0] if fr else None, hearts=fr[0][1] if fr else None)
            if e not in recipe_how[n.strip()]: recipe_how[n.strip()].append(e)
recipe_shop = collections.defaultdict(list)
for sk, sh in SHOPS.items():
    for it in sh['Items'] or []:
        if it.get('IsRecipe') and it.get('ItemId'):
            e = dict(k='shop', shop=SHOPN.get(sk, {'DesertTrade': tx('Comerciante del desierto', 'Desert Trader')}.get(sk, sk)), price=it['Price'] if it.get('Price', -1) >= 0 else None, cond=cond(it.get('Condition')))
            if it.get('TradeItemId'): e['trade'] = [bare(it['TradeItemId']), it.get('TradeItemAmount', 1)]
            if e not in recipe_shop[it['ItemId']]: recipe_shop[it['ItemId']].append(e)
for k, r in C('Data/MuseumRewards').items():
    if r.get('RewardItemIsRecipe') and r.get('RewardItemId'):
        need = [t['Tag'][5:] for t in r.get('TargetContextTags') or [] if t.get('Tag', '').startswith('id_o_')]
        recipe_shop[r['RewardItemId']].append(dict(k='museum', items=[i for i in need if i in OBJ]))
        for i in need:
            if i in OBJ: src(i)
def unlock(name, rule, cook, qid):
    out = []; p = (rule or '').split()
    if p and p[0] == 'default': out.append(dict(k='default'))
    elif p and p[0] == 's' and len(p) > 2: out.append(dict(k='skill', skill=SKILL.get(p[1], p[1]), lvl=int(p[2])))
    elif p and p[0] == 'f' and len(p) > 2: out.append(dict(k='friend', npc=NPCN.get(p[1], p[1]), hearts=int(p[2])))
    if cook and name in TV: out.append(dict(k='tv', ep=TV[name]))
    out += recipe_shop.get(qid, []) + recipe_how.get(name, [])
    if 'receta:' + name in NOTES: out.append(dict(k='note', text=NOTES['receta:' + name]))
    return out
recipes = []
for book, cook in ((CRAFT, False), (COOK, True)):
    for name, v in book.items():
        p = v.split('/'); outp = p[2].split(); big = not cook and p[3] == 'true'; oid = outp[0]
        if big:
            b = BIG.get(oid)
            if not b: continue
            disp, spr_, price = tr(b['DisplayName']), [b['SpriteIndex'] % 8 * 16, b['SpriteIndex'] // 8 * 32], b['Price']
        else:
            if oid not in OBJ: continue
            disp, spr_, price = objects[oid]['n'], None, OBJ[oid]['Price']
        ing = p[0].split(); ing = [[ing[i], int(ing[i + 1])] for i in range(0, len(ing) - 1, 2)]
        for i, _ in ing:
            if i in OBJ: src(i)
        if not big: src(oid)
        rule = p[3] if cook else p[4]
        buffs = []
        for bf in (OBJ[oid].get('Buffs') or []) if not big else []:
            at = {k: v for k, v in (bf.get('CustomAttributes') or {}).items() if v}
            if at: buffs.append(dict(at=at, min=bf.get('Duration', 0)))
        recipes.append(dict(key=name, cook=cook, big=big, id=oid, n=int(outp[1]) if len(outp) > 1 else 1, name=disp, s=spr_, price=price, ing=ing,
                            e=OBJ[oid]['Edibility'] if not big else None, buffs=buffs, how=unlock(name, rule, cook, ('(BC)' if big else '(O)') + oid)))
recipes.sort(key=lambda r: (r['cook'], r['name']))
catnames = {str(c): catname(c) for c in sorted({int(i) for r in recipes for i, _ in r['ing'] if i.lstrip('-').isdigit() and int(i) < 0})}
catnames.update({k: M['CraftingRecipe.cs.' + v] for k, v in {'-2': '569', '-75': '570', '-4': '571', '-5': '572', '-6': '573', '-777': '574'}.items()})
for k in OBJ: src(k)  # el buscador muestra de dónde sale cualquier objeto
# ---------- artesanales: las máquinas que procesan productos, con sus reglas tal como están en Data/Machines
ART_M = ['(BC)12', '(BC)15', '(BC)16', '(BC)24', '(BC)17', '(BC)19', '(BC)10', '(BC)163', '(BC)Dehydrator', '(BC)FishSmoker']
FLAV = {'Wine': '348', 'Juice': '350', 'Jelly': '344', 'Pickle': '342', 'Roe': '812', 'AgedRoe': '447', 'Honey': '340', 'DriedFruit': 'DriedFruit', 'DriedMushroom': 'DriedMushrooms', 'SmokedFish': 'SmokedFish'}
CATTAG = {'category_fruits': -79, 'category_vegetable': -75, 'category_greens': -81, 'category_fish': -4, 'category_flowers': -80}
def entra(o, tags, cond):
    ot = set(o.get('ContextTags') or [])
    for t in tags:
        if t in CATTAG:
            if o['Category'] != CATTAG[t]: return False
        elif t not in ot: return False
    for c in [x.strip() for x in (cond or '').split(',') if x.strip()]:
        if c == '!ITEM_CONTEXT_TAG Input edible_mushroom' and 'edible_mushroom' in ot: return False
        m = re.match(r'ITEM_EDIBILITY Input (-?\d+)', c)
        if m and o['Edibility'] < int(m.group(1)): return False
    return True
def tag_label(tags):
    for t in tags:
        if t == 'category_greens': return tx(catname(-81) + ' comestible', 'Edible ' + catname(-81).lower())
        if t in CATTAG: return catname(CATTAG[t])
        if t == 'edible_mushroom': return tx('Hongo comestible', 'Edible mushroom')
        if t == 'egg_item': return M['CraftingRecipe.cs.572']
    return None
artisan = []
for mk in ART_M:
    m = MACH.get(mk); b = BIG.get(mk[4:])
    if not m or not b: continue
    rules = []
    for r in m.get('OutputRules') or []:
        inp, labels, n, rcond, only = [], [], 1, None, None
        for t in r.get('Triggers') or []:
            n = t.get('RequiredCount') or 1
            if t.get('Condition') and 'LOCATION_SEASON' in t['Condition']: rcond = t['Condition']
            if t.get('RequiredItemId'):
                i = bare(t['RequiredItemId'])
                if i in OBJ and i not in inp: inp.append(i)
                sab = [x for x in t.get('RequiredTags') or [] if x.startswith('preserve_sheet_index_')]
                if sab: only = sab[0].rsplit('_', 1)[1]  # p. ej. hueva solo de esturión
            elif t.get('RequiredTags'):
                lb = tag_label(t['RequiredTags'])
                if lb and lb not in labels: labels.append(lb)
                for k, o in OBJ.items():
                    if k not in inp and o['Category'] not in (0, -999) and entra(o, t['RequiredTags'], t.get('Condition')): inp.append(k)
        for o in (r.get('OutputItem') or [])[:1]:
            iid = o.get('ItemId') or ''; fl = iid.split()
            flav = fl[1] if iid.startswith('FLAVORED_ITEM') else None
            out = FLAV.get(flav) if flav else bare(iid) if iid else None
            aging = (o.get('CustomData') or {}).get('AgingMultiplier')
            rules.append(dict(id=r['Id'], inp=inp, labels=labels, n=n, out=out if out in OBJ else None, flav=flav, stack=max(1, o.get('MinStack') or 1), q=max(0, o.get('Quality') if o.get('Quality') is not None else -1), only=only if only in OBJ else None,
                              min=r.get('MinutesUntilReady', -1), days=r.get('DaysUntilReady', -1), aging=float(aging) if aging else None, noWinter=bool(rcond and "Winter" in rcond)))
        for i in inp: src(i)
    extra = [[bare(x['ItemId']), x.get('RequiredCount', 1)] for x in m.get('AdditionalConsumedItems') or []]
    rk = next((r['key'] for r in recipes if r['big'] and r['id'] == mk[4:]), None)
    artisan.append(dict(id=mk[4:], name=tr(b['DisplayName']), desc=tr(b.get('Description')) or '', s=[b['SpriteIndex'] % 8 * 16, b['SpriteIndex'] // 8 * 32], recipe=rk, extra=extra, rules=rules))
flowers = sorted({c['item'] for c in crops if c['cat'] == -80})
OS = strings('Objects')
flavNames = {f: OS.get(k + '_Flavored_Name') for f, k in {'Wine': 'Wine', 'Juice': 'Juice', 'Jelly': 'Jelly', 'Pickle': 'Pickles', 'AgedRoe': 'AgedRoe', 'Roe': 'Roe', 'Honey': 'Honey', 'DriedFruit': 'DriedFruit', 'DriedMushroom': 'DriedFruit', 'SmokedFish': 'SmokedFish'}.items()}
flavNames['HoneyWild'] = OS.get('Honey_Wild_Name')
# ---------- festivales: los grandes tienen fecha fija; los pasivos duran varios días
festivals = []
for k, key in FEST.items():
    sk = re.match(r'([a-z]+)(\d+)', key)
    festivals.append(dict(id=k, name=festname(k), s=SKEY[sk.group(1)], d=[int(sk.group(2))]))
U16 = strings('1_6_Strings')
for k, f in C('Data/PassiveFestivals').items():
    nm = tr(f.get('DisplayName')) if f.get('DisplayName') else U16.get(k, k)
    festivals.append(dict(id=k, name=nm or k, s=SKEY.get(str(f['Season']).lower(), f['Season']) if not isinstance(f['Season'], int) else f['Season'], d=list(range(f['StartDay'], f['EndDay'] + 1)), passive=True))
for a in animals:
    for x in a['prod'] + a['deluxe']:
        if x['id'] in OBJ: src(x['id'])
for k, v in sources.items():
    key = k if k in NOTES else OBJ[k]['Name'] if OBJ[k]['Name'] in NOTES else None
    if key: v['note'] = NOTES[key]
# ---------- pestaña Objetos: todo lo que el juego registra como ítem (objetos grandes, armas, calzado, sombreros,
# ropa, herramientas, baratijas y muebles), con su sprite y de dónde sale, siempre desde los datos.
import sys; sys.path.insert(0, HERE); import ropa
from PIL import Image as _Img
SHEETS = {}; TEX = {}
def hoja(tex, default):
    t = re.sub(r'[\\/]+', '/', tex or default)
    nm = {'Maps/springobjects': 'o', 'TileSheets/Objects_2': 'o2', 'TileSheets/Craftables': 'big'}.get(t, t.split('/')[-1])
    if nm not in SHEETS: TEX[nm] = _Img.open(os.path.join(RAW, t + '.png')).convert('RGBA'); SHEETS[nm] = list(TEX[nm].size)
    return nm
def grilla(nm, i, w, h, alto=None):  # como Game1.getSourceRectForStandardTileSheet
    W = SHEETS[nm][0]; return [nm, i * w % W, i * w // W * (alto or h), w, h]
def sin_traducir(n, en): return n == en and bool(re.search(r'_|[a-z][A-Z]', n or ''))
items = {}; qsrc = collections.defaultdict(dict)
def qadd(q, k, v):
    l = qsrc[q].setdefault(k, [])
    if v not in l: l.append(v)
for k, b in BIG.items():
    q = '(BC)' + k; n = tr(b['DisplayName']) or b['Name']
    items[q] = dict(k='BC', n=n, d=tr(b['Description']) or '', p=b['Price'], s=grilla(hoja(b.get('Texture'), 'TileSheets/Craftables'), b['SpriteIndex'], 16, 32), g=tx('Máquinas', 'Machines') if q in MACH else tx('Objetos grandes', 'Big craftables'))
    if sin_traducir(n, b['Name']) or n == '???': items[q]['x'] = 1
WEAP = C('Data/Weapons')
WT = {0: M['Tool.cs.14306'], 1: M['Tool.cs.14304'], 2: M['Tool.cs.14305'], 3: M['Tool.cs.14306']}
for k, w in WEAP.items():
    items['(W)' + k] = dict(k='W', n=tr(w['DisplayName']) or w['Name'], d=tr(w['Description']) or '', s=grilla(hoja(w.get('Texture'), 'TileSheets/weapons'), w['SpriteIndex'], 16, 16),
                            g=WT.get(w['Type']) or tr(WEAP['32']['DisplayName']), wt=w['Type'], dmg=[w['MinDamage'], w['MaxDamage']], spd=w['Speed'], cc=round(w['CritChance'], 4), cm=w['CritMultiplier'],
                            kb=round(w['Knockback'], 2), df=w['Defense'], pr=w['Precision'], aoe=w['AreaOfEffect'])
BES = C('Data/Boots.es-ES') if not EN and has('Data/Boots.es-ES') else {}
for k, v in C('Data/Boots').items():
    p = v.split('/'); pe = BES.get(k, v).split('/')
    nm = hoja(p[9] if len(p) > 9 and p[9] else None, 'Maps/springobjects')
    items['(B)' + k] = dict(k='B', n=pe[6] if len(pe) > 6 else p[6], d=pe[1], p=int(p[2]), s=grilla(nm, int(p[8]) if len(p) > 8 and p[8] else int(k), 16, 16), g=M['Boots.cs.12501'], df=int(p[3]), im=int(p[4]))
HES = C('Data/hats.es-ES') if not EN and has('Data/hats.es-ES') else {}
for k, v in C('Data/hats').items():
    p = v.split('/'); pe = HES.get(k, v).split('/')
    nm = hoja(p[7] if len(p) > 7 and p[7] else None, 'Characters/Farmer/hats')
    items['(H)' + k] = dict(k='H', n=pe[5] if len(pe) > 5 and pe[5] else p[0], d=pe[1], s=grilla(nm, int(p[6]) if len(p) > 6 and p[6] else int(k), 20, 20, alto=80), g=tx('Sombreros', 'Hats'))
RL = ropa.layout(RAW); SHEETS['ropa'] = ropa.tamano(len(RL))
for i, (q, kind, v) in enumerate(RL):
    x, y = ropa.celda(i); w = 8 if kind == 'S' else 16
    items[q] = dict(k=kind, n=tr(v['DisplayName']) or v['Name'], d=tr(v['Description']) or '', p=v['Price'], s=['ropa', x, y, w, w], g=UI['Character_Shirt'] if kind == 'S' else UI['Character_Pants'])
    if v.get('CanBeDyed'): items[q]['dye'] = 1
    if v.get('CanChooseDuringCharacterCustomization'): qsrc[q]['custom'] = 1
    if sin_traducir(items[q]['n'], v['Name']): items[q]['x'] = 1
for k, t in C('Data/Tools').items():
    q = '(T)' + k
    items[q] = dict(k='T', n=tr(t['DisplayName']) or t['Name'], d=tr(t['Description']) or '', p=max(t['SalePrice'], 0), s=grilla(hoja(t.get('Texture'), 'TileSheets/tools'), t['MenuSpriteIndex'] if t['MenuSpriteIndex'] >= 0 else t['SpriteIndex'], 16, 16), g=M['Tool.cs.14307'])
    if t.get('ConventionalUpgradeFrom'): qsrc[q]['upg'] = dict(de=t['ConventionalUpgradeFrom'], price=t['SalePrice'], conv=1)
    for u in t.get('UpgradeFrom') or []:
        qsrc[q]['upg'] = dict(de=u.get('RequireToolId'), price=u['Price'] if u.get('Price', -1) >= 0 else t['SalePrice'], trade=[bare(u['TradeItemId']), u.get('TradeItemAmount', 1)] if u.get('TradeItemId') else None)
for k, t in C('Data/Trinkets').items():
    q = '(TR)' + k
    items[q] = dict(k='TR', n=tr(t['DisplayName']) or k, d=tr(t['Description']) or '', s=grilla(hoja(t.get('Texture'), 'TileSheets/Objects_2'), t['SheetIndex'], 16, 16), g=U16.get('Trinket', tx('Baratija', 'Trinket')))
    if t.get('DropsNaturally', True): qsrc[q]['azar'] = 1
    if t.get('CanBeReforged', True): items[q]['forja'] = 1
# Muebles: tamaño del sprite como Furniture.getDefaultSourceRectForType cuando la fila no lo trae.
FT = {'chair': 0, 'bench': 1, 'couch': 2, 'armchair': 3, 'dresser': 4, 'long table': 5, 'painting': 6, 'lamp': 7, 'decor': 8, 'other': 9, 'bookcase': 10, 'table': 11, 'rug': 12, 'window': 13, 'fireplace': 14, 'bed': 15, 'torch': 16, 'sconce': 17}
FDEF = {0: (1, 2), 1: (2, 2), 2: (3, 2), 3: (2, 2), 4: (2, 2), 5: (5, 3), 6: (2, 2), 7: (1, 3), 8: (1, 2), 10: (2, 3), 11: (2, 3), 12: (3, 2), 13: (1, 2), 14: (2, 5), 16: (1, 2), 17: (1, 2)}
FNAME = {'chair': tx('Sillas', 'Chairs'), 'bench': tx('Bancos', 'Benches'), 'couch': tx('Sofás', 'Couches'), 'armchair': tx('Sillones', 'Armchairs'), 'dresser': tx('Cómodas', 'Dressers'), 'long table': tx('Mesas', 'Tables'), 'table': tx('Mesas', 'Tables'), 'painting': tx('Cuadros', 'Paintings'), 'lamp': tx('Lámparas', 'Lamps'), 'decor': M['Object.cs.12859'], 'other': tx('Otros muebles', 'Other furniture'),
         'bookcase': tx('Estanterías', 'Bookcases'), 'rug': tx('Alfombras', 'Rugs'), 'window': tx('Ventanas', 'Windows'), 'fireplace': tx('Chimeneas', 'Fireplaces'), 'bed': tx('Camas', 'Beds'), 'bed double': tx('Camas', 'Beds'), 'bed child': tx('Camas', 'Beds'), 'torch': tx('Antorchas', 'Torches'), 'sconce': tx('Apliques', 'Sconces'), 'fishtank': tx('Peceras', 'Fish tanks'), 'randomized_plant': M['Object.cs.12859']}
FURN = {}
for k, v in C('Data/Furniture').items():
    p = v.split('/') + [''] * 12; q = '(F)' + k
    nm = hoja(p[9] or None, 'TileSheets/furniture'); idx = int(p[8]) if p[8] else int(k)
    tw, th = map(int, p[2].split()) if p[2] != '-1' else FDEF.get(FT.get(p[1], 9), (1, 2))
    W = SHEETS[nm][0]; n = tr(p[7]) or p[0]
    items[q] = dict(k='F', n=n, d='', p=int(p[5]), s=[nm, idx * 16 % W, idx * 16 // W * 16, tw * 16, th * 16], g=FNAME.get(p[1], p[1]))
    if sin_traducir(n, p[0]): items[q]['x'] = 1
    FURN[q] = dict(off=p[10] == 'true', tags=p[11].split(), num=k.isdigit() and int(k))
# ---- de dónde sale cada uno
PFN = {f['id']: f['name'] for f in festivals}
CATN = {'Furniture Catalogue': '(F)1226', 'Catalogue': '(F)1308', 'JojaFurnitureCatalogue': '(F)JojaCatalogue', 'JunimoFurnitureCatalogue': '(F)JunimoCatalogue', 'WizardFurnitureCatalogue': '(F)WizardCatalogue', 'RetroFurnitureCatalogue': '(F)RetroCatalogue', 'TrashFurnitureCatalogue': '(F)TrashCatalogue'}
def shopname(sk):
    if sk in SHOPN: return SHOPN[sk]
    if sk in CATN: return items[CATN[sk]]['n']
    if sk.startswith('DesertFestival_'):
        w = sk[15:]; return f"{PFN.get('DesertFestival', sk)} ({NPCN[w] if w in NPCN else tx('huevos de calicó', 'calico eggs') if w == 'EggShop' else w})"
    if sk.startswith('Festival_NightMarket'): return PFN.get('NightMarket', sk)
    return {'HatMouse': f"{tx('Ratón de los sombreros', 'Hat Mouse')} ({LN['Forest']})", 'DesertTrade': tx('Comerciante del desierto', 'Desert Trader'), 'BooksellerTrade': SHOPN['Bookseller']}.get(sk)
QPAT = re.compile(r'\((BC|W|B|H|S|P|T|TR|F)\)')
for sk, sh in SHOPS.items():
    nombre = shopname(sk)
    if not nombre: continue
    for it in sh['Items'] or []:
        iid = it.get('ItemId') or ''
        for x in [iid] + (it.get('RandomItemId') or []):
            if not x or not QPAT.match(x) or x not in items or it.get('IsRecipe'): continue
            o = items[x]; pr = it['Price'] if it.get('Price', -1) >= 0 else o.get('p') if o['k'] == 'F' else o['p'] * 2 if o['k'] == 'BC' else None
            if pr is not None: pr = mult(pr, it.get('PriceModifiers'))
            if pr is not None and not it.get('IgnoreShopPriceModifiers') and sh.get('PriceModifiers'): pr = mult(pr, sh['PriceModifiers'])
            e = dict(shop=nombre, key=sk, price=pr, cond=cond(it.get('Condition')))
            if it.get('TradeItemId'):
                e['trade'] = [bare(it['TradeItemId']), it.get('TradeItemAmount', 1)]
                if not it.get('Price', -1) > 0: e['price'] = None
            if sh.get('Currency'): e['currency'] = sh['Currency']
            qadd(x, 'shop', e)
        m = re.match(r'RANDOM_ITEMS \((F|S)\) (\d+) (\d+)', iid)
        if m and '@isRandomSale' in iid:
            a, b = int(m.group(2)), int(m.group(3))
            for q, o in items.items():
                if o['k'] != m.group(1) or not q[3:].isdigit() or not a <= int(q[3:]) <= b or o.get('p', 0) <= 0 or FURN.get(q, {}).get('off'): continue
                qadd(q, 'rot', dict(shop=nombre, cond=cond(it.get('Condition'))))
        if iid.startswith('ALL_ITEMS (F)'):
            pc = it.get('PerItemCondition') or ''
            si = re.findall(r'(?<!!)ITEM_CONTEXT_TAG Target (\w+)', pc); no = re.findall(r'!ITEM_CONTEXT_TAG Target (\w+)', pc)
            for q, f in FURN.items():
                if ('@isRandomSale' in iid and f['off']) or any(t not in f['tags'] for t in si) or any(t in f['tags'] for t in no): continue
                qadd(q, 'catal', nombre)
for k, mq in C('Data/MonsterSlayerQuests').items():
    r = mq.get('RewardItemId')
    if not r: continue
    e = dict(name=tr(mq['DisplayName']), n=mq['Count'], price=mq.get('RewardItemPrice', -1))
    if r.startswith('(O)') and r[3:] in sources: sources[r[3:]]['slayer'] = e
    elif r in items: qsrc[r]['slayer'] = e
for k, r in C('Data/MuseumRewards').items():
    rid = r.get('RewardItemId')
    if not rid or r.get('RewardItemIsRecipe'): continue
    need = []
    for t in r.get('TargetContextTags') or []:
        tg = t.get('Tag', '')
        if tg.startswith('id_o_'): need.append(tg[5:])
        else: need.append(dict(n=t.get('Count', 1), t={'item_type_arch': 'arch', 'item_type_minerals': 'min'}.get(tg, 'any')))
    if rid.startswith('(O)') and rid[3:] in sources: sources[rid[3:]].setdefault('museum', []).append(need)
    elif rid in items: qadd(rid, 'museum', need)
# Cartas que traen objetos adjuntos (%item id ... %%); el título es lo que va después de [#].
MAILES = CL('Data/mail')
for k, v in MAILES.items():
    tit = v.split('[#]')[-1].strip() if '[#]' in v else None
    for m in re.finditer(r'%item (id|object|bigobject|furniture) ([^%]+?) ?%%', v):
        pre = {'object': '(O)', 'bigobject': '(BC)', 'furniture': '(F)'}.get(m.group(1), '')
        for tok in m.group(2).split():
            q = pre + tok if pre else tok
            if not q.startswith('('): continue
            if q.startswith('(O)') and q[3:] in sources: sources[q[3:]].setdefault('mail', []).append(tit) if tit not in sources[q[3:]].get('mail', []) else None
            elif q in items: qadd(q, 'mail', tit)
for k, o in OBJ.items():
    if o.get('ArtifactSpotChances') and k in sources: sources[k]['dig'] = sorted({SCHED_LOC.get(l, LN.get(l, l)) for l in o['ArtifactSpotChances']})
# Máquina de coser: las etiquetas de Data/TailoringRecipes, resueltas contra las etiquetas de cada objeto.
TAGCAT = {'category_fish': -4, 'category_fruits': -79, 'category_vegetable': -75, 'category_flowers': -80, 'category_greens': -81, 'category_gem': -2, 'category_minerals': -12, 'category_egg': -5, 'category_milk': -6}
def otags(k, o):
    t = set(o.get('ContextTags') or [])
    t |= {'id_o_' + k.lower(), 'item_' + o['Name'].strip().lower().replace(' ', '_').replace("'", ''), 'item_type_' + o['Type'].lower()}
    t |= {tg for tg, c in TAGCAT.items() if o['Category'] == c}
    return t
OTAGS = {k: otags(k, o) for k, o in OBJ.items() if not objects[k].get('x')}
SEWN = next((tr(b['DisplayName']) for b in BIG.values() if b['Name'] == 'Sewing Machine'), tx('Máquina de coser', 'Sewing Machine'))
sin_resolver = []
for r in C('Data/TailoringRecipes'):
    tags = r['SecondItemTags']; ids = sorted((k for k, t in OTAGS.items() if all(x in t for x in tags)), key=lambda k: objects[k]['n'])
    base = None if r['FirstItemTags'] == ['item_cloth'] else [k for k, t in OTAGS.items() if all(x in t for x in r['FirstItemTags'])]
    if not ids: sin_resolver.append(r['Id']); continue
    cat = next((catname(TAGCAT[t]) for t in tags if t in TAGCAT), None)
    salen = [x for x in [r.get('CraftedItemID')] + (r.get('CraftedItemIDs') or []) if x]
    fem = r.get('CraftedItemIdFeminine')
    for x in salen + ([fem] if fem else []):
        x = x if x.startswith('(') else '(O)' + x
        e = dict(ids=ids[:24], mas=max(0, len(ids) - 24), cat=cat, azar=len(salen) > 1, fem=x == fem and 1 or (0 if fem else None), base=base)
        if x.startswith('(O)') and x[3:] in sources: sources[x[3:]].setdefault('sew', []).append(e)
        elif x in items: qadd(x, 'sew', e)
for q, v in qsrc.items():
    if q in NOTES: v['note'] = NOTES[q]
for q, v in items.items():
    if v['k'] == 'T' and qsrc.get(q, {}).get('upg', {}).get('conv') and 'herr:conv' in NOTES: qsrc[q]['upg']['note'] = NOTES['herr:conv']
# Sin dibujo en la hoja: objetos que quedaron en los datos pero el juego no usa (p. ej. Caja baba, Seto).
hoja(None, 'Maps/springobjects'); hoja(None, 'TileSheets/Objects_2')
for v in list(objects.values()) + list(items.values()):
    nm, x, y, w, h = (v['s'] + [16, 16])[:5]
    if nm in TEX and TEX[nm].crop((x, y, x + w, y + h)).getchannel('A').getextrema()[1] == 0: v['x'] = 1
for q in NOTES:
    if q.startswith('(') and q in items: qsrc[q]['note'] = NOTES[q]
SHEETS.update({nm: SHEETS.get(nm) or list(_Img.open(os.path.join(RAW, t + '.png')).size) for nm, t in (('o', 'Maps/springobjects'), ('o2', 'TileSheets/Objects_2'), ('big', 'TileSheets/Craftables'))})
MANUAL_WHERE = {'158': dict(loc=M['MapPage.cs.11098'], area=tx('piso 20', 'floor 20'), ss=ALL_S, lvl=0, boss=False, cond=[], quest=False, isl=False, ev=False, manual=True), '161': dict(loc=M['MapPage.cs.11098'], area=tx('piso 60', 'floor 60'), ss=ALL_S, lvl=0, boss=False, cond=[], quest=False, isl=False, ev=False, manual=True)}
for f in fish:
    if f['id'] in MANUAL_WHERE and not f.get('where'): f['where'] = [MANUAL_WHERE[f['id']]]
kegFixed = {}
for r in MACH['(BC)12']['OutputRules']:
    for t in r['Triggers']:
        o = bare((r['OutputItem'][0].get('ItemId') or ''))
        if t.get('RequiredItemId') and o in OBJ: kegFixed[bare(t['RequiredItemId'])] = dict(out=o, n=t.get('RequiredCount', 1), min=r['MinutesUntilReady'])
times = {k: {r['Id']: r['MinutesUntilReady'] for r in MACH[k]['OutputRules']} for k in ('(BC)12', '(BC)15', '(BC)Dehydrator')}
prof = {n: dict(name=UI.get('LevelUp_ProfessionName_' + n, n), desc=UI.get('LevelUp_ProfessionDescription_' + n, '')) for n in ('Tiller', 'Artisan', 'Agriculturist', 'Rancher', 'Coopmaster', 'Shepherd', 'Fisher', 'Angler')}
out = dict(meta=dict(version='1.6.15', lang=LANG), objects=objects, crops=crops, trees=trees, fert=fert, fish=fish, animals=animals, buildings=buildings, incubators=inc, villagers=villagers, rooms=list(rooms.values()), remix=remix, sources=sources, prof=prof, seasons=SEASON, kegFixed=kegFixed, machineTimes=times, recipes=recipes, catnames=catnames, festivals=festivals, tvNote=NOTES.get('receta:TV'), artisan=artisan, flowers=flowers, flavNames=flavNames, artNotes={k[4:]: v for k, v in NOTES.items() if k.startswith('art:')}, tapper=TAPPER, items=items, qsources=dict(qsrc), sheets=SHEETS, names=dict(sew=SEWN, adv=SHOPN['AdventureShop'], smith=SHOPN['Blacksmith'], anvil=items.get('(BC)Anvil', {}).get('n', tx('Yunque', 'Anvil'))))
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
js = 'window.SDV=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
SALIDA = 'data.en.js' if EN else 'data.js'
open(os.path.join(ROOT, 'data', SALIDA), 'w', encoding='utf8').write(js)
print(SALIDA, len(js) // 1024, 'KB')
print('cultivos', len(crops), 'árboles', len(trees), 'peces', len(fish), 'animales', len(animals), 'aldeanos', len(villagers), 'salas', len(rooms), 'lotes', sum(len(r['bundles']) for r in rooms.values()))
print('sin zona de pesca:', [f['name'] for f in fish if not f.get('trap') and not f['where']])
print('sin precio de semilla:', [c['name'] for c in crops if not any(s['price'] for s in c['sources'])])
print('sin fuente (lotes):', [objects[k]['n'] for k, v in sources.items() if not v])
print('ítems', collections.Counter(v['k'] for v in items.values()), 'sin fuente:', sum(1 for q, v in items.items() if not qsrc.get(q) and not v.get('x')), 'costura sin resolver:', sin_resolver)
print('NPC sin agenda:', [v['name'] for v in villagers if not v['sched']])
print('recetas', len(recipes), 'sin forma de aprender:', [r['key'] for r in recipes if not r['how']])
print('artesanales', [(a['name'], len(a['rules']), sum(len(r['inp']) for r in a['rules'])) for a in artisan])
print('festivales', [(f['name'], f['s'], f['d']) for f in festivals])
print('zonas sin nombre:', sorted({z['n'] for v in villagers for z in v['zones'] if z['n'] == z['k']}))
