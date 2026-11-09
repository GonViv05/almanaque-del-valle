// Fórmulas del juego. Sin DOM: también se ejecuta en Node para los tests (tools/test-calc.mjs).
(function (root) {
  const QUALITY = [1, 1.25, 1.5, 2];
  const SEASON_LEN = 28;

  // Replica HoeDirt.applySpeedIncreases: quita días por fase, hasta 3 pasadas.
  function growthPhases(phases, speed, agriculturist, paddyBonus) {
    const p = phases.slice();
    let boost = speed + (agriculturist ? 0.1 : 0) + (paddyBonus ? 0.25 : 0);
    if (boost <= 0) return p;
    const total = p.reduce((a, b) => a + b, 0);
    let remove = Math.ceil(total * boost - 1e-9), tries = 0;
    while (remove > 0 && tries < 3) {
      for (let i = 0; i < p.length; i++) {
        if ((i > 0 || p[i] > 1) && p[i] > 0) { p[i]--; remove--; }
        if (remove <= 0) break;
      }
      tries++;
    }
    return p;
  }

  // Probabilidades de calidad: el juego prueba iridio, oro y plata, en ese orden.
  function qualityChances(level, fert) {
    const gold = 0.2 * (level / 10) + 0.2 * fert * ((level + 2) / 12) + 0.01;
    const silver = Math.min(0.75, gold * 2);
    const pI = fert >= 3 ? Math.min(1, gold / 2) : 0;
    const pG = (1 - pI) * Math.min(1, gold);
    const rest = 1 - pI - pG;
    const pS = fert >= 3 ? rest : rest * silver;
    return { normal: Math.max(0, 1 - pI - pG - pS), silver: pS, gold: pG, iridium: pI };
  }

  function unitPrice(base, q, mult) { return Math.floor(Math.floor(base * QUALITY[q]) * mult); }

  // Unidades por cosecha: la primera lleva calidad, las extra salen normales.
  function yieldPerHarvest(crop, level) {
    const max = Math.max(crop.minH, crop.maxH) + Math.floor(level * crop.perLvl);
    const stack = (crop.minH + max) / 2;
    const p = Math.min(0.9, crop.extra || 0);
    return stack + (p > 0 ? p / (1 - p) : 0);
  }

  function seasonsAvailable(crop, season) {
    let n = 0, s = season;
    while (n < 4 && crop.seasons.includes(s)) { n++; s = (s + 1) % 4; }
    return n;
  }

  // Días de cosecha (absolutos, día 1 = primer día de la estación de siembra).
  function harvestDays(crop, day, opts) {
    const { speed = 0, agriculturist = false, season = 0, greenhouse = false, replant = true, horizon = null } = opts || {};
    const g = growthPhases(crop.phases, speed, agriculturist, false).reduce((a, b) => a + b, 0);
    const n = greenhouse ? 4 : seasonsAvailable(crop, season);
    if (n === 0) return { growth: g, days: [], end: 0 };
    const end = horizon || SEASON_LEN * n;
    const days = [];
    let d = day + g;
    if (crop.regrow > 0) {
      while (d <= end) { days.push(d); d += crop.regrow; }
    } else if (replant) {
      while (d <= end) { days.push(d); d += g; }
    } else if (d <= end) days.push(d);
    return { growth: g, days, end, cycles: crop.regrow > 0 ? (days.length ? 1 : 0) : days.length };
  }

  // Precio de venta de una unidad procesada. Devuelve null si el cultivo no admite ese proceso.
  function processed(crop, kind, kegFixed) {
    const fruit = crop.cat === -79, veg = crop.cat === -75;
    const b = crop.price;
    if (kind === 'wine') return fruit ? { price: Math.floor(b * 3), per: 1 } : null;
    if (kind === 'juice') return veg ? { price: Math.floor(b * 2.25), per: 1 } : null;
    if (kind === 'jelly') return fruit ? { price: b * 2 + 50, per: 1 } : null;
    if (kind === 'pickles') return veg ? { price: b * 2 + 50, per: 1 } : null;
    if (kind === 'dried') return fruit ? { price: Math.floor(b * 7.5) + 25, per: 5 } : null;
    if (kind === 'keg' && kegFixed && kegFixed[crop.item]) return { fixed: kegFixed[crop.item] };
    return null;
  }

  function simulate(crop, o) {
    const fert = o.fert || { kind: null, val: 0 };
    const speed = fert.kind === 'speed' ? fert.val : 0;
    const fertQ = fert.kind === 'quality' ? fert.val : 0;
    const h = harvestDays(crop, o.day, { speed, agriculturist: o.agriculturist, season: o.season, greenhouse: o.greenhouse, replant: o.replant !== false, horizon: o.horizon });
    const chances = qualityChances(o.level, fertQ);
    const tiller = o.tiller ? 1.1 : 1, artisan = o.artisan ? 1.4 : 1;
    const perTile = yieldPerHarvest(crop, o.level);
    const q = crop.minQ || 0;
    const firstVal = q > 0 ? unitPrice(crop.price, q, tiller)
      : chances.normal * unitPrice(crop.price, 0, tiller) + chances.silver * unitPrice(crop.price, 1, tiller) + chances.gold * unitPrice(crop.price, 2, tiller) + chances.iridium * unitPrice(crop.price, 3, tiller);
    let perHarvestValue;
    if (o.process && o.process !== 'raw') {
      const p = processed(crop, o.process, o.kegFixed);
      if (p && p.fixed) perHarvestValue = (perTile / p.fixed.n) * Math.floor(o.objectPrice(p.fixed.out) * artisan);
      else if (p) perHarvestValue = (perTile / p.per) * Math.floor(p.price * artisan);
      else perHarvestValue = firstVal + (perTile - 1) * unitPrice(crop.price, 0, tiller);
    } else perHarvestValue = firstVal + (perTile - 1) * unitPrice(crop.price, 0, tiller);
    const harvests = h.days.length, qty = o.qty;
    const units = harvests * perTile * qty;
    const revenue = harvests * perHarvestValue * qty;
    const plantings = crop.regrow > 0 ? (harvests ? 1 : 0) : harvests;
    const seedCost = Math.max(plantings, harvests ? 1 : 0) * (o.seedPrice || 0) * qty;
    const fertCost = harvests ? (o.fertPrice || 0) * qty : 0;
    const cost = seedCost + fertCost;
    const lastDay = harvests ? h.days[harvests - 1] : o.day;
    const span = Math.max(1, lastDay - o.day);
    const net = revenue - cost;
    return { growth: h.growth, harvestDays: h.days, harvests, end: h.end, perTile, units, chances, perHarvestValue, revenue, seedCost, fertCost, cost, net, span, perDay: net / span, perTileDay: net / span / Math.max(1, qty), roi: cost > 0 ? net / cost : null };
  }

  root.Calc = { QUALITY, SEASON_LEN, growthPhases, qualityChances, unitPrice, yieldPerHarvest, seasonsAvailable, harvestDays, processed, simulate };
})(typeof window !== 'undefined' ? window : globalThis);
