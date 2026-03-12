import { useEffect, useState } from "react";

const CATS = [
  { id: "sql",    label: "SQL",    emoji: "🗄️", color: "#f9a8d4", bg: "#fff0f6", dark: "#be185d" },
  { id: "python", label: "Python", emoji: "🐍", color: "#6ee7b7", bg: "#f0fdf7", dark: "#065f46" },
  { id: "ingles", label: "Inglés", emoji: "📘", color: "#fcd34d", bg: "#fffbeb", dark: "#92400e" },
  { id: "otro",   label: "Otro",   emoji: "✨", color: "#c4b5fd", bg: "#f5f3ff", dark: "#5b21b6", custom: true },
];

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function fmt(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function todayKey() { return new Date().toISOString().split("T")[0]; }
function dayLabel(k) {
  const [y,mo,d] = k.split("-").map(Number);
  const date = new Date(y, mo-1, d);
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = (now - date) / 86400000;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return date.toLocaleDateString("es-ES", { weekday:"short", day:"numeric", month:"short" });
}
function getCat(s) {
  if (s.category === "otro" && s.customLabel) return { ...CATS[3], label: s.customLabel };
  return CATS.find(c => c.id === s.category) || CATS[3];
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error("api_error");
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("api_error");
  return res.json();
}
async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("api_error");
  return res.json();
}
async function apiDel(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error("api_error");
  return res.json();
}

export default function App() {
  const [data, setData] = useState({});
  const [goalMin, setGoalMin] = useState(120);
  const [goalInp, setGoalInp] = useState("120");
  const [hrs, setHrs] = useState("0");
  const [mins, setMins] = useState("30");
  const [cat, setCat] = useState("sql");
  const [customLabel, setCustomLabel] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("add");
  const [added, setAdded] = useState(false);
  const [apiError, setApiError] = useState("");

  const today = todayKey();
  const todaySess = data[today] || [];
  const totalToday = todaySess.reduce((a,s) => a+s.minutes, 0);

  useEffect(() => {
    (async () => {
      try {
        const [sessions, goal] = await Promise.all([
          apiGet("/api/sessions"),
          apiGet("/api/goal"),
        ]);

        const grouped = {};
        for (const s of sessions) {
          const key = s.date;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            id: s.id,
            minutes: s.minutes,
            category: s.category,
            customLabel: s.customLabel,
            note: s.note,
            time: s.time,
          });
        }

        const g = goal?.goalMin ?? 120;
        setGoalMin(g);
        setGoalInp(String(g));
        setData(grouped);
        setApiError("");
      } catch {
        setApiError("No se pudo conectar con el backend. Revisa el servidor y el archivo .env.");
      }
    })();
  }, []);

  const allSess = Object.values(data).flat();
  const totalAll = allSess.reduce((a,s) => a+s.minutes, 0);
  const daysStudied = Object.keys(data).filter(d => (data[d]||[]).length > 0).length;

  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(6-i));
    return d.toISOString().split("T")[0];
  });
  const maxDay = Math.max(...last7.map(d => (data[d]||[]).reduce((a,s)=>a+s.minutes,0)), goalMin, 60);

  const catTotals = CATS.map(c => ({
    ...c,
    minutes: todaySess.filter(s=>s.category===c.id).reduce((a,s)=>a+s.minutes, 0),
    label: c.id==="otro"
      ? (todaySess.find(s=>s.category==="otro"&&s.customLabel)?.customLabel || "Otro")
      : c.label,
  }));

  function buildBarSegments() {
    let filled = 0;
    const segs = [];
    for (const s of todaySess) {
      if (filled >= goalMin) break;
      const c = getCat(s);
      const take = Math.min(s.minutes, goalMin - filled);
      if (take > 0) segs.push({ color: c.color, w: (take/goalMin)*100 });
      filled += s.minutes;
    }
    return segs;
  }

  const barSegs = buildBarSegments();
  const goalPct = Math.min((totalToday/goalMin)*100, 100);
  const extraMin = Math.max(0, totalToday - goalMin);
  const isOver = totalToday > goalMin;
  const extraW = isOver ? Math.min((extraMin/goalMin)*22, 22) : 0;

  async function handleAdd() {
    const h = parseInt(hrs)||0, m = parseInt(mins)||0;
    const total = h*60+m;
    if (total <= 0) return;

    try {
      const timeStr = new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
      const created = await apiPost("/api/sessions", {
        sessionDate: today,
        minutes: total,
        category: cat,
        customLabel: cat==="otro" ? customLabel : "",
        note: note.trim(),
        sessionTime: timeStr,
      });

      setData(prev => ({...prev, [today]: [...(prev[today]||[]), {
        id: created.id,
        minutes: created.minutes,
        category: created.category,
        customLabel: created.customLabel,
        note: created.note,
        time: created.time,
      }]}));

      setNote(""); setHrs("0"); setMins("30");
      setAdded(true); setTimeout(()=>setAdded(false), 2000);
      setApiError("");
    } catch {
      setApiError("No se pudo guardar la sesión. Verifica el backend.");
    }
  }

  async function handleDel(dateKey, id) {
    try {
      await apiDel(`/api/sessions/${id}`);
      setData(prev => ({...prev, [dateKey]: (prev[dateKey]||[]).filter(s=>s.id!==id)}));
      setApiError("");
    } catch {
      setApiError("No se pudo eliminar la sesión. Verifica el backend.");
    }
  }

  async function handleGoal(v) {
    setGoalInp(v);
    const n = parseInt(v);
    if (!isNaN(n) && n > 0) {
      setGoalMin(n);
      try {
        await apiPut("/api/goal", { goalMin: n });
        setApiError("");
      } catch {
        setApiError("No se pudo guardar la meta. Verifica el backend.");
      }
    }
  }

  const todayDateStr = new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div className="app">
      <div className="hdr">
        <div className="hdr-row">
          <div>
            <div className="brand">study <em>diary</em> 💗</div>
            <div className="date-sub">{todayDateStr}</div>
          </div>
          <div className="total-box">
            <div className="total-lbl">hoy</div>
            <div className="total-val">{fmt(totalToday)}</div>
          </div>
        </div>
        <div className="tabs">
          {[["add","🌷 Agregar"],["dashboard","🌿 Dashboard"],["history","🕊️ Historial"]].map(([t,l])=> (
            <button key={t} className={`tab${tab===t?" on":""}`} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="body">
        {apiError && <div className="api-warn">{apiError}</div>}

        <div className="goal-card">
          <div className="goal-top">
            <span className="goal-lbl">🎯 meta del día</span>
            <div className="goal-setter">
              <input className="goal-inp" type="number" min="10" max="720"
                value={goalInp} onChange={e=>handleGoal(e.target.value)} />
              <span className="goal-unit">min</span>
            </div>
          </div>

          <div className="bar-track">
            <div className="bar-segments">
              {barSegs.map((seg,i) => (
                <div key={i} className="bar-seg" style={{width:`${seg.w}%`, background:seg.color}} />
              ))}
              {isOver && <div className="bar-extra-stripe" style={{width:`${extraW}%`}} />}
            </div>
            {totalToday === 0 && (
              <div className="bar-ghost">
                <span className="bar-ghost-txt">empieza a estudiar ✨</span>
              </div>
            )}
          </div>

          {todaySess.length > 0 && (
            <div className="legend">
              {CATS.filter(c=>todaySess.some(s=>s.category===c.id)).map(c=>{
                const lbl = c.id==="otro"
                  ? (todaySess.find(s=>s.category==="otro"&&s.customLabel)?.customLabel||"Otro")
                  : c.label;
                return (
                  <div key={c.id} className="leg-item" style={{background:c.bg,color:c.dark}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                    {lbl}
                  </div>
                );
              })}
              {isOver && <div className="leg-item" style={{background:"#fff0f6",color:"#be185d"}}>extra +{fmt(extraMin)} 🌸</div>}
            </div>
          )}

          <div className="bar-meta">
            <span>{fmt(totalToday)} de {fmt(goalMin)}</span>
            <span>
              <span className="bar-pct">{Math.round(goalPct)}%</span>
              {isOver && <span className="extra-pill">+{fmt(extraMin)} extra</span>}
            </span>
          </div>
        </div>

        {totalToday > 0 && (
          <div className="cat-cards">
            {catTotals.filter(c=>c.minutes>0).map(c=>{
              const pct = Math.round((c.minutes/totalToday)*100);
              return (
                <div key={c.id} className="cat-card" style={{background:c.bg, borderColor:c.color+"55"}}>
                  <div className="cc-top">
                    <span className="cc-emoji">{c.emoji}</span>
                    <span className="cc-pct" style={{color:c.dark}}>{pct}%</span>
                  </div>
                  <div className="cc-time" style={{color:c.dark}}>{fmt(c.minutes)}</div>
                  <div className="cc-label" style={{color:c.dark}}>{c.label}</div>
                  <div className="cc-bar" style={{background:c.color+"33"}}>
                    <div className="cc-bar-fill" style={{width:`${pct}%`,background:c.color}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "add" && (
          <div>
            <div className="card">
              <div className="sec-lbl">⏱ tiempo estudiado</div>
              <div className="time-row">
                <div className="t-field">
                  <input className="t-inp" type="number" min="0" max="23"
                    value={hrs} onChange={e=>setHrs(e.target.value)} placeholder="0"/>
                  <div className="t-lbl">horas</div>
                </div>
                <div className="t-sep">:</div>
                <div className="t-field">
                  <input className="t-inp" type="number" min="0" max="59"
                    value={mins} onChange={e=>setMins(e.target.value)} placeholder="30"/>
                  <div className="t-lbl">minutos</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="sec-lbl">🌷 categoría</div>
              <div className="cats-grid">
                {CATS.map(c=> (
                  <button key={c.id} className={`c-btn${cat===c.id?" on":""}`}
                    style={cat===c.id?{background:c.color,borderColor:c.color}:{background:c.bg}}
                    onClick={()=>setCat(c.id)}>
                    <span className="c-emoji">{c.emoji}</span>{c.label}
                  </button>
                ))}
              </div>
              {cat==="otro" && (
                <input className="custom-inp" placeholder="¿Qué estás estudiando? 🌸"
                  value={customLabel} onChange={e=>setCustomLabel(e.target.value)}/>
              )}
            </div>

            <div className="card">
              <div className="sec-lbl">📝 nota (opcional)</div>
              <input className="note-inp" placeholder="¿Qué temas viste hoy?"
                value={note} onChange={e=>setNote(e.target.value)}/>
            </div>

            <button className={`add-btn ${added?"ok":"idle"}`} onClick={handleAdd}>
              {added ? "✓ ¡Registrado! ✨" : "Registrar sesión 🌸"}
            </button>

            {todaySess.length > 0 && (
              <div style={{marginTop:20}}>
                <div className="sec-lbl" style={{marginBottom:9}}>sesiones de hoy</div>
                <div className="s-list">
                  {[...todaySess].reverse().map(s=>{
                    const c = getCat(s);
                    return (
                      <div key={s.id} className="s-row" style={{borderLeft:`3px solid ${c.color}`, background:c.bg}}>
                        <div>
                          <div className="s-cat" style={{color:c.dark}}>{c.emoji} {c.label}</div>
                          {s.note && <div className="s-note">{s.note}</div>}
                        </div>
                        <div style={{display:"flex",alignItems:"center"}}>
                          <div>
                            <div className="s-time" style={{color:c.dark}}>{fmt(s.minutes)}</div>
                            <div className="s-clock">{s.time}</div>
                          </div>
                          <button className="s-del" onClick={()=>handleDel(today,s.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "dashboard" && (
          <div>
            <div className="stat-grid">
              {[
                {l:"Total acumulado", v:fmt(totalAll), s:"todas las sesiones"},
                {l:"Días estudiados", v:daysStudied, s:"con registro"},
                {l:"Promedio diario", v:daysStudied>0?fmt(Math.round(totalAll/daysStudied)):"—", s:"por día activo"},
                {l:"Sesiones totales", v:allSess.length, s:"registros"},
              ].map(c=> (
                <div key={c.l} className="stat-card">
                  <div className="sl">{c.l}</div>
                  <div className="sv">{c.v}</div>
                  <div className="ss">{c.s}</div>
                </div>
              ))}
            </div>

            <div className="chart-card">
              <div className="sec-lbl">últimos 7 días</div>
              <div className="bars7">
                {last7.map(d=>{
                  const dayMin = (data[d]||[]).reduce((a,s)=>a+s.minutes,0);
                  const barH = Math.max(Math.round((dayMin/maxDay)*76), dayMin>0?4:2);
                  const goalH = Math.round((goalMin/maxDay)*76);
                  const isToday = d===today;
                  const daySess = data[d]||[];
                  return (
                    <div key={d} className="b7-col">
                      <div className="b7-val">{dayMin>0?fmt(dayMin):""}</div>
                      <div className="b7-bar-wrap">
                        <div className="b7-bar" style={{height:barH}}>
                          {dayMin > 0 ? (
                            CATS.map(c=>{
                              const cMin = daySess.filter(s=>s.category===c.id).reduce((a,s)=>a+s.minutes,0);
                              const h = Math.round((cMin/dayMin)*barH);
                              return cMin>0 ? <div key={c.id} style={{width:"100%",height:h,background:c.color,flexShrink:0}}/> : null;
                            })
                          ) : (
                            <div style={{width:"100%",height:"100%",background:"#ede9fe"}}/>
                          )}
                        </div>
                        <div style={{position:"absolute",bottom:goalH,left:0,right:0,height:1.5,background:"#a78bfa",opacity:.5,borderRadius:1,pointerEvents:"none"}}/>
                      </div>
                      <div className="b7-lbl" style={{color:isToday?"#7c3aed":"#c4b5fd",fontWeight:isToday?600:400}}>
                        {dayLabel(d)==="Hoy"?"HOY":new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short"}).slice(0,3).toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="goal-line-label">
                <div className="goal-line"/> meta del día
              </div>
            </div>

            {catTotals.filter(c=>c.minutes>0).length > 0 ? (
              <div className="bdown-card">
                <div className="sec-lbl" style={{marginBottom:12}}>desglose de hoy</div>
                {catTotals.filter(c=>c.minutes>0).sort((a,b)=>b.minutes-a.minutes).map(c=>{
                  const pct = Math.round((c.minutes/totalToday)*100);
                  return (
                    <div key={c.id} className="bd-row">
                      <div className="bd-meta">
                        <span style={{color:c.dark,fontWeight:500}}>{c.emoji} {c.label}</span>
                        <span style={{color:"#9d8ec0"}}>{fmt(c.minutes)} · {pct}%</span>
                      </div>
                      <div className="bd-track">
                        <div className="bd-fill" style={{width:`${pct}%`,background:c.color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">Aún no hay sesiones hoy 🌸<br/>¡Empieza a estudiar!</div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            {Object.keys(data).filter(d=>(data[d]||[]).length>0).length===0 ? (
              <div className="empty">No hay historial aún 🌷</div>
            ) : (
              Object.keys(data)
                .filter(d=>(data[d]||[]).length>0)
                .sort((a,b)=>b.localeCompare(a))
                .map(dk=>{
                  const ds = data[dk];
                  const dt = ds.reduce((a,s)=>a+s.minutes,0);
                  return (
                    <div key={dk} className="hday">
                      <div className="hday-hdr">
                        <span>{dayLabel(dk)}</span>
                        <span className="hday-tot">{fmt(dt)}</span>
                      </div>
                      <div className="s-list">
                        {ds.map(s=>{
                          const c = getCat(s);
                          return (
                            <div key={s.id} className="s-row" style={{borderLeft:`3px solid ${c.color}`,background:c.bg}}>
                              <div>
                                <div className="s-cat" style={{color:c.dark}}>{c.emoji} {c.label}</div>
                                {s.note && <div className="s-note">{s.note}</div>}
                              </div>
                              <div style={{display:"flex",alignItems:"center"}}>
                                <div>
                                  <div className="s-time" style={{color:c.dark}}>{fmt(s.minutes)}</div>
                                  <div className="s-clock">{s.time}</div>
                                </div>
                                <button className="s-del" onClick={()=>handleDel(dk,s.id)}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
