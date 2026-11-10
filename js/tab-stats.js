// Estadísticas: lo que registra tools/vigia.py a medida que jugás.
const RUBROS = [['cultivo', T('Cultivos')], ['pesca', T('Pesca')], ['ganaderia', T('Ganadería')], ['otros', T('Otros')]];
const OTROS_TIP = T('Calidad extra, ventas en tiendas, misiones y lo que no es de estos rubros.');
const leyenda = () => `<div class="legend">${RUBROS.map(([k, n]) => `<span class="rub-${k}"${k === 'otros' ? ` data-tip="t:${OTROS_TIP}"` : ''}><i class="sw"></i>${n}</span>`).join('')}</div>`;
function barrasRubro(cat) {
  const t = RUBROS.reduce((a, [k]) => a + (cat?.[k] || 0), 0) || 1;
  return RUBROS.map(([k, n]) => `<div class="zone rub-${k}"><span>${n}: ${gold(cat?.[k] || 0)}</span><div class="track"><div class="fill rub" style="width:${(cat?.[k] || 0) * 100 / t}%"></div></div><span class="small">${Math.round((cat?.[k] || 0) * 100 / t)}%</span></div>`).join('');
}
const fechaDe = r => `${T('{d} de {s}', { d: r.d, s: SEASONS[r.s] })}, ${T('año {y}', { y: r.y })}`;
function graficoDias(dias) {
  const ult = dias.slice(-28); if (ult.length < 2) return `<p class="small muted">${T('El gráfico aparece cuando haya dos días registrados.')}</p>`;
  const max = Math.max(...ult.map(r => r.ingreso), 1);
  const col = r => `<div class="col" data-tip="t:${esc(`${fechaDe(r)}: ${T('{n} de oro', { n: num(r.ingreso) })}${r.dias > 1 ? T(' ({n} días juntos)', { n: r.dias }) : ''}. ${RUBROS.map(([k, n]) => `${n} ${num(r.cat[k])}`).join(', ')}`)}">${RUBROS.filter(([k]) => r.cat[k] > 0).map(([k]) => `<i class="rub-${k}" style="height:${Math.max(2, r.cat[k] / max * 200)}px"></i>`).join('')}</div>`;
  return `<p class="stack-max">${T('Máximo: {n} de oro en un día', { n: num(max) })}</p><div class="stack">${ult.map(col).join('')}</div>${leyenda()}`;
}
const CONTADORES = [['fishCaught', T('Peces atrapados')], ['timesFished', T('Veces que pescaste')], ['cropsShipped', T('Cultivos enviados')], ['itemsShipped', T('Objetos enviados')], ['ChickenEggsLayed', T('Huevos puestos')], ['PreservesMade', T('Conservas hechas')], ['itemsForaged', T('Recolectados')], ['daysPlayed', T('Días jugados')]];
TABS.stats = {
  label: T('Estadísticas'), icon: () => itemSpr('336', 2),
  render(v) {
    const P = partida();
    if (!P) { v.innerHTML = `<p class="empty">${T('Todavía no llegó ninguna partida. Activá el programa con este comando y dormí un día en el juego:')}<br><br><code>systemctl --user enable --now almanaque-vigia</code></p>`; return; }
    const I = P.ingresos;
    v.innerHTML = `<div class="split"><section>
      <h2>${T('Ingresos de {g}', { g: esc(P.granja) })}</h2>
      <div class="kpis"><div><span>${T('Ganado en total')}</span><b class="big">${num(P.total)}</b></div><div><span>${T('Último día')}</span><b class="big">${I.hoy == null ? '—' : num(I.hoy)}</b></div><div><span>${T('Dinero actual')}</span><b class="big">${num(P.dinero)}</b></div></div>
      <h3>${T('Por día')}</h3>${graficoDias(I.dias)}
      <h3>${T('Por rubro, toda la partida')}</h3><p class="small muted">${T('El total es real. El reparto es estimado con lo enviado y su precio base: el juego no guarda cuánto ganaste por rubro.')}</p>${barrasRubro(I.acumulado)}
      ${I.estaciones.length ? `<h3>${T('Por estación')}</h3><div class="tscroll" style="min-height:0"><table><thead><tr><th>${T('Estación')}</th><th class="n">${T('Total')}</th>${RUBROS.map(([, n]) => `<th class="n">${n}</th>`).join('')}</tr></thead><tbody>${I.estaciones.map(e => `<tr><td>${SEASONS[e.s]}, ${T('año {y}', { y: e.y })}</td><td class="n">${num(e.ingreso)}</td>${RUBROS.map(([k]) => `<td class="n">${num(e.cat[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      ${I.dias.length ? `<details style="margin-top:10px"><summary>${T('Ver todos los días')}</summary><table><thead><tr><th>${T('Día')}</th><th class="n">${T('Total')}</th>${RUBROS.map(([, n]) => `<th class="n">${n}</th>`).join('')}</tr></thead><tbody>${[...I.dias].reverse().map(r => `<tr><td>${fechaDe(r)}</td><td class="n">${num(r.ingreso)}</td>${RUBROS.map(([k]) => `<td class="n">${num(r.cat[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></details>` : ''}
    </section><aside class="panel">
      <h2>${T('Niveles')}</h2><dl class="kv"><dt>${T('Agricultura')}</dt><dd>${P.niveles.farming}</dd><dt>${T('Pesca')}</dt><dd>${P.niveles.fishing}</dd><dt>${T('Recolección')}</dt><dd>${P.niveles.foraging}</dd><dt>${T('Minería')}</dt><dd>${P.niveles.mining}</dd><dt>${T('Combate')}</dt><dd>${P.niveles.combat}</dd></dl>
      <h3>${T('Contadores')}</h3><dl class="kv">${CONTADORES.map(([k, n]) => `<dt>${n}</dt><dd>${num(P.stats[k] || 0)}${I.statsHoy[k] ? ` <span class="pos small">+${num(I.statsHoy[k])}</span>` : ''}</dd>`).join('')}</dl>
      <h3>${T('Animales')}</h3><p class="small">${P.animales.length ? T('{n} en la granja.', { n: P.animales.length }) : T('Todavía no tenés animales.')}</p>
      <h3>${T('Lo más enviado')}</h3><div class="grid">${I.top.filter(([i]) => obj(i)).map(([i, n]) => slot(i, { n })).join('')}</div>
    </aside></div>`;
  },
};
