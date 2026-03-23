// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";

const B = {
  blue:"#1d4ed8", teal:"#0891b2", green:"#059669", purple:"#7c3aed",
  orange:"#d97706", red:"#dc2626", amber:"#b45309", grey:"#f8fafc",
  border:"#e2e8f0", text:"#0f172a", sub:"#64748b", light:"#94a3b8",
};

const LINES = [
  {
    id:"BM-101", name:"Ball Mill Line 1", type:"Ball Mill & Grinding", location:"Module A",
    icon:"⚙️", color:B.blue, status:"running",
    kpis:{ throughput:"48 t/hr", particleSize:"42 micron", motorLoad:"78%", yield:"97.2%" },
    aiAlert:"Particle size trending 3 microns above spec. AI adjusting mill speed by 2 RPM. Bearing temp nominal.",
    health:88, defects:{ oversize:4, undersize:1, contamination:0 },
    vibration:{ val:2.8, warn:4.0, crit:6.5, unit:"mm/s" },
    temp:{ val:62, warn:80, crit:95, unit:"C" },
    aiAction:"Auto-corrected",
  },
  {
    id:"KL-201", name:"Tunnel Kiln", type:"Kiln / Firing Furnace", location:"Module B",
    icon:"🔥", color:B.red, status:"warning",
    kpis:{ temperature:"1190C", speed:"3.2 m/hr", fuelFlow:"142 Nm3/hr", yield:"94.1%" },
    aiAlert:"Zone 4 temperature 22C below setpoint. AI recommends burner adjustment — potential warping risk if uncorrected.",
    health:71, defects:{ warped:18, cracked:6, underfired:4, overfired:2 },
    vibration:{ val:1.2, warn:3.0, crit:5.0, unit:"mm/s" },
    temp:{ val:1190, warn:1220, crit:1250, unit:"C" },
    aiAction:"Action Required",
  },
  {
    id:"PR-301", name:"Hydraulic Press", type:"Press & Forming", location:"Module C",
    icon:"🏗️", color:B.purple, status:"running",
    kpis:{ tonnage:"3,800 T", cycleTime:"8.2 sec", thickness:"10.1 mm", yield:"98.8%" },
    aiAlert:"All parameters nominal. Die wear index 0.42 — 58% remaining life. Next maintenance in 14 days.",
    health:94, defects:{ thickness:2, cracks:0, edges:1, contamination:0 },
    vibration:{ val:3.1, warn:5.0, crit:8.0, unit:"mm/s" },
    temp:{ val:38, warn:65, crit:80, unit:"C" },
    aiAction:"Monitoring",
  },
  {
    id:"GL-401", name:"Glazing Line", type:"Glazing & Spray", location:"Module D",
    icon:"✨", color:B.teal, status:"running",
    kpis:{ throughput:"1,240 tiles/hr", coatWeight:"280 g/m2", uniformity:"98.4%", yield:"97.6%" },
    aiAlert:"Spray nozzle 3 showing 8% flow deviation. AI scheduling maintenance for next shift change.",
    health:82, defects:{ uneven:6, drips:2, pinholes:3, contamination:0 },
    vibration:{ val:0.8, warn:2.0, crit:4.0, unit:"mm/s" },
    temp:{ val:28, warn:45, crit:60, unit:"C" },
    aiAction:"Maintenance Due",
  },
  {
    id:"QC-501", name:"Vision QC Line", type:"Sorting & Vision AI", location:"Module E",
    icon:"🔬", color:B.green, status:"running",
    kpis:{ tested:"4,820 tiles/hr", gradeA:"93.8%", gradeB:"4.4%", reject:"1.8%" },
    aiAlert:"Grade A yield 93.8% - above 92% target. AI flagged 3 tiles with micro-cracks invisible to human inspection.",
    health:97, defects:{ surface:22, dimensional:8, color:6, structural:3 },
    vibration:{ val:0.4, warn:1.5, crit:3.0, unit:"mm/s" },
    temp:{ val:24, warn:40, crit:55, unit:"C" },
    aiAction:"Monitoring",
  },
];

const KILN_ZONES = [
  { zone:"Zone 1", name:"Pre-heat",    temp:450, target:450, status:"ok" },
  { zone:"Zone 2", name:"Heat-up",     temp:820, target:820, status:"ok" },
  { zone:"Zone 3", name:"Firing 1",    temp:1150,target:1150,status:"ok" },
  { zone:"Zone 4", name:"Firing 2",    temp:1168,target:1190,status:"warn" },
  { zone:"Zone 5", name:"Peak",        temp:1188,target:1190,status:"warn" },
  { zone:"Zone 6", name:"Slow Cool",   temp:980, target:980, status:"ok" },
  { zone:"Zone 7", name:"Fast Cool",   temp:620, target:620, status:"ok" },
  { zone:"Zone 8", name:"Exit",        temp:180, target:180, status:"ok" },
];

const DEFECT_TYPES = [
  { name:"Surface Crack",  count:22, color:B.red },
  { name:"Warping",        count:18, color:B.orange },
  { name:"Dimensional",    count:8,  color:B.purple },
  { name:"Glaze Uneven",   count:6,  color:B.teal },
  { name:"Color Var.",     count:6,  color:B.blue },
  { name:"Structural",     count:3,  color:B.amber },
];

const genKilnTrend = () => Array.from({length:24},(_,i)=>({
  hr:`${i}:00`,
  zone4: +(1168+Math.sin(i*0.5)*8+Math.random()*4).toFixed(0),
  zone5: +(1185+Math.sin(i*0.4)*6+Math.random()*3).toFixed(0),
  target:1190,
}));

const genVibTrend = (line) => Array.from({length:30},(_,i)=>({
  sample:`S${i+1}`,
  value: +(line.vibration.val*(0.85+Math.random()*0.3)+(i>22?0.4:0)).toFixed(2),
  warn:line.vibration.warn,
}));

const genYieldTrend = () => Array.from({length:30},(_,i)=>({
  day:`D${i+1}`,
  gradeA: +(91+Math.random()*4+(i>20?1.5:0)).toFixed(1),
  gradeB: +(4+Math.random()*2-(i>20?0.5:0)).toFixed(1),
  reject: +(1.5+Math.random()*1.5-(i>20?0.3:0)).toFixed(1),
}));

const KILN_TREND = genKilnTrend();
const YIELD_TREND = genYieldTrend();

const StatusPill = ({ status }) => {
  const cfg = {
    running:["#f0fdf4","#059669","● RUNNING"],
    warning:["#fffbeb","#d97706","⚠ WARNING"],
    stopped:["#fff5f5","#dc2626","■ STOPPED"],
  };
  const [bg,col,lbl] = cfg[status]||["#f8fafc","#94a3b8","—"];
  return <span style={{background:bg,color:col,border:`1px solid ${col}40`,borderRadius:4,padding:"2px 9px",fontSize:10,fontWeight:700,letterSpacing:0.8,whiteSpace:"nowrap"}}>{lbl}</span>;
};

const CT = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
      <div style={{color:"#64748b",fontWeight:600,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=>(<div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}</div>))}
    </div>
  );
};

function SignInScreen({ onSubmit }) {
  const [form, setForm] = useState({ name:"", company:"", email:"" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const validate = () => {
    const e = {};
    if(!form.name.trim()) e.name="Required";
    if(!form.company.trim()) e.company="Required";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email="Valid email required";
    return e;
  };
  const handleSubmit = async () => {
    const e = validate(); if(Object.keys(e).length){setErrors(e);return;}
    setSubmitting(true);
    try {
      await fetch("https://formspree.io/f/xqeywrry",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({name:form.name,company:form.company,email:form.email,_subject:`AriLinc Tiles Mfg Sign-in: ${form.name} from ${form.company}`})});
    } catch(_){}
    onSubmit(form);
  };
  const inp = k => ({width:"100%",padding:"11px 14px",borderRadius:8,fontSize:14,border:`1.5px solid ${errors[k]?"#fca5a5":"rgba(255,255,255,0.25)"}`,outline:"none",fontFamily:"Inter,sans-serif",color:"#0f172a",background:"#fff",marginTop:5});
  const lbl = {fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.75)",letterSpacing:0.3};
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,background:"rgba(255,255,255,0.15)",borderRadius:16,marginBottom:16,border:"1px solid rgba(255,255,255,0.25)"}}>
            <span style={{fontSize:28}}>🏗️</span>
          </div>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:28,fontWeight:800,color:"#fff",marginBottom:4}}>AriLinc</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Tiles Manufacturing Intelligence · by AriPrus</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>Kiln Intelligence · Vision QC · Predictive Maintenance</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",borderRadius:20,padding:"32px",border:"1px solid rgba(255,255,255,0.18)",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:20,fontWeight:800,color:"#fff",marginBottom:4,textAlign:"center"}}> Sign In</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",textAlign:"center",marginBottom:24}}>Access the Tiles Intelligence Platform</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><label style={lbl}>Full Name *</label><input style={inp("name")} value={form.name} onChange={set("name")} />{errors.name&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.name}</div>}</div>
            <div><label style={lbl}>Company *</label><input style={inp("company")} value={form.company} onChange={set("company")} />{errors.company&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.company}</div>}</div>
            <div><label style={lbl}>Work Email *</label><input type="email" style={inp("email")} value={form.email} onChange={set("email")} />{errors.email&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.email}</div>}</div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={{width:"100%",marginTop:28,padding:"14px",background:submitting?"rgba(255,255,255,0.15)":"#fff",color:submitting?"rgba(255,255,255,0.4)":"#1d4ed8",border:"none",borderRadius:10,fontSize:15,fontWeight:800,cursor:submitting?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
            {submitting?"Launching...":"Launch Platform"}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:14}}>Secure · <a href="mailto:info@ariprus.com" style={{color:"rgba(255,255,255,0.6)",textDecoration:"none",fontWeight:600}}>info@ariprus.com</a></div>
        </div>
        <div style={{textAlign:"center",marginTop:18,fontSize:12,color:"rgba(255,255,255,0.25)"}}>2026 AriPrus · <a href="https://ariprus.com" style={{color:"rgba(255,255,255,0.45)",textDecoration:"none"}}>ariprus.com</a></div>
      </div>
    </div>
  );
}

export default function TilesMfg() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("lines");
  const [selectedLine, setSelectedLine] = useState(LINES[1]);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date().toLocaleTimeString()),1000); return()=>clearInterval(t); },[]);

  useEffect(()=>{
    const el = document.createElement("style");
    el.textContent = [
      "*{box-sizing:border-box;margin:0;padding:0;}",
      ".card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);}",
      ".sec-btn{padding:12px 16px;border:none;background:none;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all 0.2s;white-space:nowrap;}",
      ".sec-btn:hover{color:#0f172a;background:#f1f5f9;}",
      ".g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}",
      ".g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}",
      ".g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}",
      ".g5{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}",
      ".hdr{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}",
      ".sec-bar{background:#fff;border-bottom:2px solid #e2e8f0;padding:0 24px;display:flex;overflow-x:auto;}",
      ".pp{padding:20px 24px 32px;}",
      ".fw{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;background:#fff;}",
      "@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}",
      "@media(max-width:900px){.g3{grid-template-columns:repeat(2,1fr);}.g4{grid-template-columns:repeat(2,1fr);}.g5{grid-template-columns:repeat(3,1fr);}.g2{grid-template-columns:1fr;}.pp{padding:14px 16px;}.hdr{padding:10px 14px;}.sec-bar{padding:0 12px;}}",
      "@media(max-width:600px){.g3{grid-template-columns:1fr;}.g4{grid-template-columns:repeat(2,1fr);}.g5{grid-template-columns:repeat(2,1fr);}.g2{grid-template-columns:1fr;}.pp{padding:10px 12px;}.sec-btn{padding:10px 12px;font-size:12px;}.hdr{flex-direction:column;align-items:flex-start;}.fw{flex-direction:column;}}",
    ].join(" ");
    document.head.appendChild(el);
    return()=>{ document.head.removeChild(el); };
  },[]);

  if(!user) return <SignInScreen onSubmit={setUser}/>;

  const warningCount = LINES.filter(l=>l.status==="warning").length;

  const sections = [
    {key:"lines",   icon:"🏭", label:"Production Lines"},
    {key:"kiln",    icon:"🔥", label:"Kiln Intelligence"},
    {key:"quality", icon:"🔬", label:"Vision QC"},
    {key:"maint",   icon:"🔧", label:"Predictive Maintenance"},
    {key:"analytics",icon:"📊",label:"Analytics"},
  ];

  return (
    <div style={{background:B.grey,minHeight:"100vh",color:B.text,fontFamily:"Inter,sans-serif"}}>
      <div className="hdr">
        <div style={{flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.blue}}>AriLinc <span style={{color:B.orange}}>Tiles</span> Intelligence</div>
            <span style={{background:"#eff6ff",color:B.blue,border:"1px solid #bfdbfe",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}>CERAMICS · PORCELAIN</span>
          </div>
          <div style={{fontSize:11,color:B.light,marginTop:2}}>Tiles Manufacturing Intelligence · Powered by AriPrus</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {warningCount>0&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.orange}}>⚠ {warningCount} Alert</div>}
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.green,display:"flex",alignItems:"center",gap:5}}><span style={{animation:"blink 1s infinite"}}>●</span>LIVE</div>
          <div style={{fontSize:12,color:B.light}}>{time}</div>
          <div style={{fontSize:12,color:B.light}}>👋 {user.name} · {user.company}</div>
          <button onClick={()=>setUser(null)} style={{fontSize:11,color:B.light,background:"none",border:`1px solid ${B.border}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>

      <div className="sec-bar">
        {sections.map(s=>(
          <button key={s.key} className="sec-btn"
            style={{color:section===s.key?B.blue:B.sub,borderBottom:`3px solid ${section===s.key?B.blue:"transparent"}`,fontWeight:section===s.key?800:600}}
            onClick={()=>setSection(s.key)}>{s.icon} {s.label}</button>
        ))}
      </div>

      <div className="pp">

        {section==="lines" && (
          <div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🏭",label:"Lines Running",value:"5 / 5",sub:"All monitored",color:B.blue},
                {icon:"⚠️",label:"Lines in Warning",value:warningCount,sub:"Action needed",color:B.orange},
                {icon:"🔬",label:"Tiles Inspected",value:"4,820 / hr",sub:"Vision AI active",color:B.purple},
                {icon:"✅",label:"Grade A Yield",value:"93.8%",sub:"Above 92% target",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{fontFamily:"Inter,sans-serif",fontSize:17,fontWeight:800,color:B.text,marginBottom:14}}>Production Line Status</div>
            <div className="g3">
              {LINES.map(line=>{
                const vibData = genVibTrend(line).filter((_,fi)=>fi%3===0);
                const vibOk = line.vibration.val < line.vibration.warn;
                const tempOk = line.temp.val < line.temp.warn;
                return (
                  <div key={line.id} style={{background:"#fff",border:`2px solid ${line.status==="warning"?"#fde68a":"#e2e8f0"}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                    <div style={{padding:"12px 16px",borderBottom:`3px solid ${line.color}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                          <span style={{fontSize:18}}>{line.icon}</span>
                          <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:B.text}}>{line.id}</div>
                        </div>
                        <div style={{fontSize:11,color:B.sub}}>{line.name}</div>
                        <div style={{fontSize:10,color:B.light}}>{line.type} · {line.location}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                        <StatusPill status={line.status}/>
                        <div style={{background:`${line.health>=90?B.green:line.health>=75?B.orange:B.red}15`,border:`1px solid ${line.health>=90?B.green:line.health>=75?B.orange:B.red}40`,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700,color:line.health>=90?B.green:line.health>=75?B.orange:B.red}}>Health {line.health}</div>
                      </div>
                    </div>
                    <div style={{padding:"8px 14px",background:"#fafafa",borderBottom:"1px solid #f1f5f9"}}>
                      <div style={{fontSize:9,color:B.light,marginBottom:3}}>Vibration & Temperature</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {[
                          {label:"Vibration",val:line.vibration.val,unit:line.vibration.unit,ok:vibOk,color:vibOk?B.green:B.red},
                          {label:"Temperature",val:line.temp.val,unit:line.temp.unit,ok:tempOk,color:tempOk?B.green:B.orange},
                        ].map((s,i)=>(
                          <div key={i} style={{background:`${s.color}08`,border:`1px solid ${s.color}25`,borderRadius:6,padding:"5px 8px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:B.light}}>{s.label}</div>
                            <div style={{fontSize:13,fontWeight:800,color:s.color}}>{s.val} {s.unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{padding:"8px 12px 4px",borderBottom:"1px solid #f1f5f9"}}>
                      <div style={{fontSize:9,color:B.light,marginBottom:2}}>Vibration Trend (30 samples)</div>
                      <ResponsiveContainer width="100%" height={45}>
                        <LineChart data={vibData} margin={{top:0,right:4,bottom:0,left:0}}>
                          <Line type="monotone" dataKey="value" stroke={line.color} strokeWidth={1.5} dot={false}/>
                          <ReferenceLine y={line.vibration.warn} stroke={B.orange} strokeDasharray="3 2" strokeWidth={1}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{padding:"8px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,borderBottom:"1px solid #f1f5f9"}}>
                      {Object.entries(line.kpis).map(([k,v])=>(
                        <div key={k} style={{background:"#f8fafc",borderRadius:6,padding:"4px 7px"}}>
                          <div style={{fontSize:8,color:B.light,textTransform:"capitalize"}}>{k.replace(/([A-Z])/g," $1").trim()}</div>
                          <div style={{fontSize:11,fontWeight:700,color:B.text}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"8px 14px"}}>
                      <div style={{background:line.status==="warning"?"#fffbeb":"#f0fdf4",border:`1px solid ${line.status==="warning"?"#fde68a":"#bbf7d0"}`,borderRadius:7,padding:"6px 10px",fontSize:11,color:B.text,lineHeight:1.5,marginBottom:8}}>
                        <strong style={{color:line.status==="warning"?B.orange:B.green}}>AI: </strong>{line.aiAlert}
                      </div>
                      <button onClick={()=>{setSelectedLine(line);setSection(line.id.startsWith("KL")?"kiln":line.id.startsWith("QC")?"quality":"maint");}} style={{width:"100%",padding:"7px",background:`${line.color}10`,border:`1px solid ${line.color}40`,borderRadius:7,fontSize:11,fontWeight:700,color:line.color,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                        View Detail
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section==="kiln" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Kiln Intelligence — Tunnel Kiln KL-201</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Real-time zone monitoring · AI temperature prediction · Warping & crack risk detection</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🔥",label:"Peak Temperature",value:"1,188°C",sub:"Target: 1,190°C",color:B.red},
                {icon:"⚡",label:"Kiln Speed",value:"3.2 m/hr",sub:"Nominal",color:B.blue},
                {icon:"⛽",label:"Fuel Flow",value:"142 Nm3/hr",sub:"Within spec",color:B.orange},
                {icon:"⚠️",label:"Zone 4 Alert",value:"-22°C",sub:"Below setpoint",color:B.orange},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:24,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="g2" style={{marginBottom:16}}>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Kiln Zone Temperature Profile</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {KILN_ZONES.map((z,i)=>{
                    const diff = z.temp - z.target;
                    const pct = Math.min(100, (z.temp/1300)*100);
                    const col = z.status==="warn"?B.orange:B.green;
                    return (
                      <div key={z.zone} style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{fontSize:11,fontWeight:700,color:B.sub,width:55,flexShrink:0}}>{z.zone}</div>
                        <div style={{fontSize:10,color:B.light,width:65,flexShrink:0}}>{z.name}</div>
                        <div style={{flex:1,background:"#f1f5f9",borderRadius:4,height:18,position:"relative"}}>
                          <div style={{height:18,borderRadius:4,background:col,width:`${pct}%`,transition:"width 0.8s"}}/>
                        </div>
                        <div style={{fontSize:11,fontWeight:800,color:col,width:48,textAlign:"right",flexShrink:0}}>{z.temp}°C</div>
                        {z.status==="warn"&&<div style={{fontSize:10,fontWeight:700,color:B.orange,flexShrink:0}}>{diff > 0?"+":""}{diff}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>Zone 4 & 5 Temperature Trend (24h)</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Zones trending below target — AI recommends burner adjustment</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={KILN_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="hr" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={3}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={38} domain={[1150,1210]} unit="C"/>
                    <Tooltip content={<CT/>}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <ReferenceLine y={1190} stroke={B.green} strokeDasharray="4 3" label={{value:"Target 1190C",fill:B.green,fontSize:9}}/>
                    <Line type="monotone" dataKey="zone4" stroke={B.orange} strokeWidth={2} dot={false} name="Zone 4 (C)"/>
                    <Line type="monotone" dataKey="zone5" stroke={B.red} strokeWidth={2} dot={false} name="Zone 5 (C)" strokeDasharray="5 3"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>AI Kiln Risk Assessment</div>
              <div className="g3">
                {[
                  {icon:"⚠️",title:"Warping Risk",level:"MEDIUM",detail:"Zone 4 deviation of 22C for 3+ hours increases warping probability to 12% vs normal 3%. AI recommends burner 4B adjustment within 30 min.",color:B.orange,bg:"#fffbeb"},
                  {icon:"🔥",title:"Energy Efficiency",level:"OPTIMISING",detail:"Fuel consumption 4.2% above baseline for current throughput. AI has identified combustion air ratio opportunity — estimated 3.1% saving.",color:B.blue,bg:"#eff6ff"},
                  {icon:"📅",title:"Refractory Wear",level:"MONITOR",detail:"Refractory lining wear index 0.34. AI predicts 87 days to next inspection threshold. Plan maintenance window.",color:B.purple,bg:"#faf5ff"},
                ].map((r,i)=>(
                  <div key={i} style={{background:r.bg,border:`1px solid ${r.color}30`,borderRadius:10,padding:"14px"}}>
                    <div style={{fontSize:22,marginBottom:6}}>{r.icon}</div>
                    <div style={{fontSize:13,fontWeight:800,color:r.color,marginBottom:3}}>{r.title}</div>
                    <div style={{fontSize:10,fontWeight:700,color:r.color,marginBottom:8,background:`${r.color}20`,borderRadius:4,display:"inline-block",padding:"2px 8px"}}>{r.level}</div>
                    <div style={{fontSize:11,color:B.text,lineHeight:1.6}}>{r.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section==="quality" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Vision AI Quality Control</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Real-time defect detection · Grade classification · SPC monitoring · 4,820 tiles per hour</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"✅",label:"Grade A Yield",value:"93.8%",sub:"Above 92% target",color:B.green},
                {icon:"📦",label:"Grade B",value:"4.4%",sub:"Second quality",color:B.orange},
                {icon:"❌",label:"Reject Rate",value:"1.8%",sub:"Below 2% target",color:B.red},
                {icon:"🔬",label:"Defects Caught",value:"39",sub:"This shift",color:B.purple},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="g2">
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Defect Pareto — This Shift</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart layout="vertical" data={DEFECT_TYPES} margin={{top:4,right:40,bottom:4,left:90}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}}/>
                    <YAxis type="category" dataKey="name" stroke="#e2e8f0" tick={{fill:"#475569",fontSize:10}} width={90}/>
                    <Tooltip content={<CT/>}/>
                    <Bar dataKey="count" fill={B.blue} radius={[0,4,4,0]} name="Count"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Grade Yield Trend (30 Days)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={YIELD_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} width={36} unit="%"/>
                    <Tooltip content={<CT/>}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <ReferenceLine y={92} stroke={B.blue} strokeDasharray="4 3" label={{value:"Target",fill:B.blue,fontSize:9}}/>
                    <Line type="monotone" dataKey="gradeA" stroke={B.green} strokeWidth={2.5} dot={false} name="Grade A (%)"/>
                    <Line type="monotone" dataKey="gradeB" stroke={B.orange} strokeWidth={1.5} dot={false} name="Grade B (%)"/>
                    <Line type="monotone" dataKey="reject" stroke={B.red} strokeWidth={1.5} dot={false} name="Reject (%)" strokeDasharray="5 3"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {section==="maint" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Predictive Maintenance</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Vibration analysis · Bearing health · Motor diagnostics · Remaining useful life</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🔧",label:"Assets Monitored",value:"24",sub:"Sensors on all critical",color:B.blue},
                {icon:"⚠️",label:"Alerts Active",value:"3",sub:"Action within 14 days",color:B.orange},
                {icon:"📅",label:"Next PM Due",value:"14 days",sub:"GL-401 nozzle service",color:B.purple},
                {icon:"💰",label:"Failures Prevented",value:"Rs 8.4L",sub:"Last 90 days",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Asset Health — All Lines</div>
              {LINES.map(l=>{
                const rul = l.health > 90 ? "90+ days" : l.health > 75 ? "30–60 days" : "Under 14 days";
                const col = l.health>=90?B.green:l.health>=75?B.orange:B.red;
                return (
                  <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,padding:"10px 12px",background:"#f8fafc",borderRadius:8,border:`1px solid ${col}20`}}>
                    <span style={{fontSize:18}}>{l.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:B.text}}>{l.id} — {l.name}</span>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{fontSize:11,color:B.light}}>Vib: {l.vibration.val} {l.vibration.unit}</span>
                          <span style={{fontSize:11,color:B.light}}>Temp: {l.temp.val}{l.temp.unit}</span>
                          <span style={{fontSize:11,fontWeight:700,color:col}}>RUL: {rul}</span>
                        </div>
                      </div>
                      <div style={{background:"#e2e8f0",borderRadius:3,height:6}}>
                        <div style={{height:6,borderRadius:3,background:col,width:`${l.health}%`,transition:"width 1s"}}/>
                      </div>
                    </div>
                    <span style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:col,minWidth:32}}>{l.health}</span>
                  </div>
                );
              })}
            </div>
            <div className="g2">
              {[
                {icon:"⚙️",id:"BM-101",title:"Ball Mill Drive — Bearing Warning",detail:"Bearing 3 temperature elevated at 62C vs 45C baseline. Vibration frequency spectrum shows early-stage wear. AI recommends lubrication check and bearing inspection within 21 days. Estimated remaining life: 45 days without intervention.",severity:"MEDIUM",color:B.orange},
                {icon:"✨",id:"GL-401",title:"Glazing Line — Nozzle Maintenance",detail:"Nozzle 3 flow deviation 8% above nominal. Coating uniformity dropping from 98.4% to 97.1% over 72 hours. AI recommends nozzle replacement at next shift change to prevent Grade B yield increase.",severity:"LOW",color:B.blue},
              ].map((a,i)=>(
                <div key={i} className="card">
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontSize:20}}>{a.icon}</span>
                    <div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:800,color:B.text}}>{a.id} — {a.title}</div>
                      <span style={{background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}40`,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{a.severity}</span>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:B.text,lineHeight:1.7,background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section==="analytics" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>Production Analytics — 30 Day Trend</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Yield · Defect rates · Kiln efficiency · Energy consumption</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"✅",label:"Avg Grade A",value:"93.1%",sub:"up 1.8% this month",color:B.green},
                {icon:"🔥",label:"Avg Kiln Efficiency",value:"94.2%",sub:"Fuel saving: 3.1%",color:B.red},
                {icon:"⚙️",label:"OEE",value:"87.4%",sub:"Above 85% target",color:B.blue},
                {icon:"💰",label:"Scrap Cost Saving",value:"Rs 12L",sub:"vs baseline",color:B.purple},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:20,marginBottom:5}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="g2">
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Grade Yield Trend (30 Days)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={YIELD_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} unit="%"/>
                    <Tooltip content={<CT/>}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Line type="monotone" dataKey="gradeA" stroke={B.green} strokeWidth={2.5} dot={false} name="Grade A (%)"/>
                    <Line type="monotone" dataKey="gradeB" stroke={B.orange} strokeWidth={1.5} dot={false} name="Grade B (%)"/>
                    <Line type="monotone" dataKey="reject" stroke={B.red} strokeWidth={1.5} dot={false} name="Reject (%)" strokeDasharray="5 3"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Kiln Temperature Stability (24h)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={KILN_TREND} margin={{top:4,right:16,bottom:4,left:0}}>
                    <defs><linearGradient id="kg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.red} stopOpacity={0.2}/><stop offset="95%" stopColor={B.red} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="hr" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={3}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={40} domain={[1150,1210]} unit="C"/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine y={1190} stroke={B.green} strokeDasharray="4 3" label={{value:"Target",fill:B.green,fontSize:9}}/>
                    <Area type="monotone" dataKey="zone4" stroke={B.orange} fill="url(#kg)" strokeWidth={2} dot={false} name="Zone 4 (C)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fw">
        <div style={{fontSize:12,color:B.light}}>AriLinc Tiles Manufacturing Intelligence · Ceramics · Porcelain · Powered by AriPrus</div>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <a href="mailto:info@ariprus.com" style={{fontSize:12,color:B.sub,textDecoration:"none"}}>info@ariprus.com</a>
          <a href="https://arilinc.ariprus.com" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:B.blue,fontWeight:700,textDecoration:"none"}}>Explore AriLinc Platform</a>
        </div>
      </div>
    </div>
  );
}
