/* Schematic exercise animations (own 2D rigs), shared with the Diary. */
const ANIM=(function(){
  const L={torso:46,neck:5,head:9,ua:26,fa:23,hd:7,th:36,sh:34,ft:13};
  const D=Math.PI/180;
  const add=(p,a,l)=>[p[0]+Math.cos(a*D)*l,p[1]+Math.sin(a*D)*l];
  const ang=(p,q)=>Math.atan2(q[1]-p[1],q[0]-p[0])/D;
  const lerp=(a,b,t)=>a+(b-a)*t;
  function ik(root,target,l1,l2,bend){
    const dx=target[0]-root[0],dy=target[1]-root[1];
    let d=Math.hypot(dx,dy); d=Math.max(Math.abs(l1-l2)+0.01,Math.min(d,l1+l2-0.01));
    const base=Math.atan2(dy,dx)/D;
    const off=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))))/D;
    const a1=base+bend*off; const j=add(root,a1,l1);
    return [a1,ang(j,target)];
  }
  function mix(A,B,t){ const o={}; for(const k in A){ const a=A[k], b=(k in B)?B[k]:a;
      if(typeof a==="number"&&typeof b==="number") o[k]=lerp(a,b,t);
      else if(Array.isArray(a)&&Array.isArray(b)) o[k]=a.map((v,i)=>lerp(v,b[i],t)); else o[k]=a; }
    for(const k in B) if(!(k in o)) o[k]=B[k]; return o; }
  /* ---- side rig ---- */
  function solveSide(P){
    const hip=[P.x,P.y], t=P.t, sh=add(hip,t,L.torso), head=add(sh,t,L.neck+L.head);
    function arm(hk,rk,uk,fk,bk){ let ua=P[uk], fa=P[fk];
      const tg=P[hk]?P[hk]:(P[rk]?[sh[0]+P[rk][0],sh[1]+P[rk][1]]:null);
      if(tg){ [ua,fa]=ik(sh,tg,L.ua,L.fa,P[bk]==null?1:P[bk]); }
      const el=add(sh,ua,L.ua), hand=add(el,fa,L.fa); return {ua,fa,el,hand}; }
    function leg(ak,tk,sk,bk,fk){ let th=P[tk], s=P[sk];
      if(P[ak]){ [th,s]=ik(hip,P[ak],L.th,L.sh,P[bk]==null?-1:P[bk]); }
      const knee=add(hip,th,L.th), ankle=add(knee,s,L.sh), toe=add(ankle,P[fk]!=null?P[fk]:s-90,L.ft); return {th,sh:s,knee,ankle,toe}; }
    const a1=arm("hand","handRel","ua","fa","ab");
    const a2=(P.hand2||P.handRel2||P.ua2!=null)?arm("hand2","handRel2","ua2","fa2","ab2"):a1;
    const l1=leg("ankle","th","sh","lb","ft");
    const l2=(P.ankle2||P.th2!=null)?leg("ankle2","th2","sh2","lb2","ft2"):l1;
    const handEnd=P.hd!=null?add(a1.hand,P.hd,L.hd):null;
    return {hip,sh,head,t,a1,a2,l1,l2,handEnd};
  }
  /* ---- drawing helpers (illustrated style) ---- */
  const f=n=>Math.round(n*10)/10;
  const P2=p=>f(p[0])+" "+f(p[1]);
  const C={skin:"#E3B38E",skinD:"#C79270",skinF:"#B8835F",skinFD:"#9C6C4D",shirt:"#2F5597",shirtD:"#22406F",shirtF:"#24467C",shorts:"#262B33",shortsF:"#1A1E24",shoe:"#ECEFF2",sole:"#59636F",hair:"#3A2A20",
    hot:"#C8F04B",eq:"#4A5462",eqL:"#6E7A8A",pad:"#3E4857",padS:"#8A95A4",cable:"#B7C0CC",wt:"#8A95A4",floor:"#283039",metalD:"#3A424E",metalL:"#9AA5B4"};
  const ln=(a,b,w,c,extra)=>{
    if(c===C.eq||c===C.eqL){ // tube look
      const dark=c===C.eq?"#3A424E":"#55606F", lite=c===C.eq?"#7C8798":"#A3AEBD";
      return '<line x1="'+f(a[0])+'" y1="'+f(a[1])+'" x2="'+f(b[0])+'" y2="'+f(b[1])+'" stroke="'+dark+'" stroke-width="'+w+'" stroke-linecap="round"/>'
        +'<line x1="'+f(a[0])+'" y1="'+f(a[1])+'" x2="'+f(b[0])+'" y2="'+f(b[1])+'" stroke="'+lite+'" stroke-width="'+Math.max(1,w*0.32)+'" stroke-linecap="round" opacity=".75"/>';
    }
    return '<line x1="'+f(a[0])+'" y1="'+f(a[1])+'" x2="'+f(b[0])+'" y2="'+f(b[1])+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"'+(extra||"")+'/>';
  };
  const ci=(c,r,fill,extra)=>'<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+r+'" fill="'+fill+'"'+(extra||"")+'/>';
  const rc=(x,y,w,h,r,fill,stroke)=>{
    if(fill===C.pad) return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="'+Math.max(3,r||0)+'" fill="url(#gPad)" stroke="#1F252D" stroke-width="1"/>'
      +'<line x1="'+f(x+4)+'" y1="'+f(y+2)+'" x2="'+f(x+w-4)+'" y2="'+f(y+2)+'" stroke="#8D98A8" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>';
    if(fill===C.eq) return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="'+(r||0)+'" fill="url(#gMetal)" stroke="#2C333D" stroke-width="1"/>';
    return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="'+(r||0)+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="1.2"':'')+'/>';
  };
  function pad(a,b,w){ w=w||9; const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1, u=[(b[0]-a[0])/d,(b[1]-a[1])/d], n=[-u[1],u[0]];
    return '<line x1="'+f(a[0])+'" y1="'+f(a[1])+'" x2="'+f(b[0])+'" y2="'+f(b[1])+'" stroke="#1F252D" stroke-width="'+(w+2)+'" stroke-linecap="round"/>'
      +'<line x1="'+f(a[0])+'" y1="'+f(a[1])+'" x2="'+f(b[0])+'" y2="'+f(b[1])+'" stroke="#465163" stroke-width="'+w+'" stroke-linecap="round"/>'
      +'<line x1="'+f(a[0]-n[0]*w*0.22)+'" y1="'+f(a[1]-n[1]*w*0.22)+'" x2="'+f(b[0]-n[0]*w*0.22)+'" y2="'+f(b[1]-n[1]*w*0.22)+'" stroke="#7D8899" stroke-width="'+(w*0.25)+'" stroke-linecap="round" opacity=".7"/>'; }
  function dumbbell(p,a){ const u=add(p,a,8), v=add(p,a+180,8);
    const head=(q)=>'<polygon points="'+[0,60,120,180,240,300].map(k=>P2(add(q,a+k+30,6.2))).join(" ")+'" fill="#5B6573" stroke="#2C333D" stroke-width="1"/>'+ci(q,2.2,"#8A95A4");
    return ln(u,v,3,"#AEB8C5")+head(u)+head(v); }
  function plate(p){ return ci(p,9,"#3F4753",' stroke="#22282F" stroke-width="1"')+ci(p,6,"#59636F")+ci(p,2.4,"#AEB8C5"); }
  function cable(from,to){ return ln(from,to,1.4,C.cable)+ci(from,5,"#55606F",' stroke="#2C333D" stroke-width="1"')+ci(from,1.8,"#A3AEBD"); }
  function stack(x,y,h,t){ let s='<rect x="'+x+'" y="'+y+'" width="16" height="'+h+'" rx="2" fill="url(#gMetal)" stroke="#2C333D"/>';
    const top=y+h-34-t*12; for(let i=0;i<5;i++) s+='<rect x="'+(x+2)+'" y="'+f(top+i*6.4)+'" width="12" height="5.6" rx="1" fill="#7A8594" stroke="#3A424E" stroke-width=".8"/>';
    for(let i=0;i<4;i++) s+='<rect x="'+(x+2)+'" y="'+f(y+h-24+i*6)+'" width="12" height="5.2" rx="1" fill="#59636F" stroke="#3A424E" stroke-width=".8"/>';
    return s; }
  function floor(){ return '<rect x="0" y="186" width="240" height="14" fill="url(#gFloor)"/>'+ln([0,186],[240,186],1.5,"#3A4350"); }
  const DEFS='<defs><linearGradient id="gMetal" x1="0" x2="1"><stop offset="0" stop-color="#3B434F"/><stop offset=".45" stop-color="#7D8899"/><stop offset="1" stop-color="#3B434F"/></linearGradient>'
    +'<linearGradient id="gPad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E5A6B"/><stop offset="1" stop-color="#2C343F"/></linearGradient>'
    +'<linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E242C"/><stop offset="1" stop-color="#0E1218"/></linearGradient>'
    +'<radialGradient id="gBg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#1C232D"/><stop offset="1" stop-color="#0E1218"/></radialGradient>'
    +'<filter id="fHot" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>';
  /* smooth limb outline from stations [t, plusWidth, minusWidth] */
  function crPath(pts){ let d="M"+P2(pts[0]);
    for(let i=0;i<pts.length-1;i++){ const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6], c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
      d+=" C"+P2(c1)+" "+P2(c2)+" "+P2(p2); } return d; }
  function limbPath(a,b,st){
    const L0=Math.hypot(b[0]-a[0],b[1]-a[1])||0.01, u=[(b[0]-a[0])/L0,(b[1]-a[1])/L0], n=[-u[1],u[0]];
    const P=st.map(([t,wp])=>[a[0]+u[0]*L0*t+n[0]*wp,a[1]+u[1]*L0*t+n[1]*wp]);
    const M=st.map(([t,,wm])=>[a[0]+u[0]*L0*t-n[0]*wm,a[1]+u[1]*L0*t-n[1]*wm]).reverse();
    const re=(st[st.length-1][1]+st[st.length-1][2])/2, rs=(st[0][1]+st[0][2])/2;
    return crPath(P)+" A"+f(re)+" "+f(re)+" 0 0 0 "+P2(M[0])+" "+crPath(M).slice(1).replace(/^[^C]*/,"")+" A"+f(rs)+" "+f(rs)+" 0 0 0 "+P2(P[0])+" Z";
  }
  const shape=(d,fill,stroke)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+(stroke||"none")+'" stroke-width="1" stroke-linejoin="round"/>';
  const hotShape=d=>'<path d="'+d+'" fill="'+C.hot+'" opacity=".5" filter="url(#fHot)"/>';
  const PROF={
    torso:[[0,11,12],[0.32,10,10],[0.72,13.5,12],[1,9,10]],
    ua:[[0,7,7],[0.5,6.4,7.2],[1,4.6,4.6]], fa:[[0,5.2,5.2],[0.25,5.6,5],[1,3.3,3.1]],
    th:[[0,9,9.5],[0.4,8.4,9.6],[1,6,6]], sh:[[0,5.6,5.4],[0.3,7.6,5],[1,3.6,3.6]],
    sleeve:[[0,7.8,7.8],[0.4,7.6,8.2]], shorts:[[0,10.8,11.2],[0.42,10.2,10.8]]
  };
  function seg(a,b,key,fill,stroke,hot){ const d=limbPath(a,b,PROF[key]); return shape(d,fill,stroke)+(hot?hotShape(d):""); }
  function hand(p,a,fill){ return '<ellipse cx="'+f(p[0])+'" cy="'+f(p[1])+'" rx="4.6" ry="3.4" transform="rotate('+f(a)+' '+f(p[0])+' '+f(p[1])+')" fill="'+fill+'" stroke="'+C.skinFD+'" stroke-width=".8"/>'; }
  function shoe(ank,toe,far){ const a=ang(ank,toe), back=add(ank,a+180,4), tip=add(toe,a,2);
    return ln(back,tip,7.5,far?"#B9C0C8":C.shoe)+ln(add(back,a+90,3.2),add(tip,a+90,3.2),2,C.sole); }
  function head(c,t,face){ // t = torso angle; face = facing unit side (+n of torso)
    const fx=Math.cos((t+90)*D), fy=Math.sin((t+90)*D), ux=Math.cos(t*D), uy=Math.sin(t*D);
    const back=[c[0]-fx*1.8-ux*0.4,c[1]-fy*1.8-uy*0.4], nose=[c[0]+fx*9.6+ux*0.5,c[1]+fy*9.6+uy*0.5];
    return '<ellipse cx="'+f(c[0])+'" cy="'+f(c[1])+'" rx="8.6" ry="9.8" transform="rotate('+f(t+90)+' '+f(c[0])+' '+f(c[1])+')" fill="'+C.skin+'" stroke="'+C.skinD+'" stroke-width="1"/>'
      +'<path d="M'+P2(add(c,t+90,6))+' Q'+P2(nose)+' '+P2(add(add(c,t+90,6.6),t+180,3))+'" fill="'+C.skin+'" stroke="'+C.skinD+'" stroke-width=".9"/>'
      +'<path d="M'+P2(add(add(c,t+90,4),t,8.4))+' A9.4 9.4 0 1 0 '+P2(add(add(c,t+90,-8.6),t+180,3.5))+' Q'+P2(add(c,t+90,-4))+' '+P2(add(add(c,t+90,2),t,4.5))+' Z" fill="'+C.hair+'"/>'
      +'<ellipse cx="'+f(back[0])+'" cy="'+f(back[1])+'" rx="1.8" ry="2.6" transform="rotate('+f(t+90)+' '+f(back[0])+' '+f(back[1])+')" fill="'+C.skinD+'"/>'
      +ci(add(add(c,t+90,5.2),t,1.6),1,"#2A2522");
  }
  function drawSide(R,hot){
    const H=new Set(hot||[]); const s=[], hotLater=[];
    const lim=(a,b,key,fill,stroke,hk,clothKey,clothFill,clothStroke)=>{ const d=limbPath(a,b,PROF[key]); s.push(shape(d,fill,stroke)); if(clothKey) s.push(seg(a,b,clothKey,clothFill,clothStroke)); if(hk&&H.has(hk)) hotLater.push(hotShape(d)); };
    const shadowX=(R.l1.ankle[0]+R.l2.ankle[0])/2;
    s.push('<ellipse cx="'+f(shadowX)+'" cy="187" rx="28" ry="3" fill="#000" opacity=".35"/>');
    // far side
    lim(R.l2.knee,R.l2.ankle,"sh",C.skinF,C.skinFD,"sh"); s.push(shoe(R.l2.ankle,R.l2.toe,true));
    lim(R.hip,R.l2.knee,"th",C.skinF,C.skinFD,"th","shorts",C.shortsF);
    lim(R.a2.el,R.a2.hand,"fa",C.skinF,C.skinFD,"fa"); s.push(hand(R.a2.hand,R.a2.fa,C.skinF));
    lim(R.sh,R.a2.el,"ua",C.skinF,C.skinFD,"ua","sleeve",C.shirtF);
    s.push(hotLater.splice(0).join(""));
    // torso, neck, head
    s.push(seg(R.sh,add(R.sh,R.t,L.neck+3),"fa",C.skin,C.skinD));
    s.push(ci(R.hip,11.5,C.shorts));
    const td=limbPath(R.hip,R.sh,PROF.torso); s.push(shape(td,C.shirt,C.shirtD));
    s.push('<path d="M'+P2(add(R.hip,R.t+90,10.5))+' L'+P2(add(R.hip,R.t-90,11.5))+'" stroke="'+C.shorts+'" stroke-width="7" stroke-linecap="round"/>');
    if(H.has("torso")) s.push(hotShape(td));
    s.push(head(R.head,R.t));
    // near side
    lim(R.l1.knee,R.l1.ankle,"sh",C.skin,C.skinD,"sh"); s.push(shoe(R.l1.ankle,R.l1.toe,false));
    lim(R.hip,R.l1.knee,"th",C.skin,C.skinD,"th","shorts",C.shorts);
    lim(R.sh,R.a1.el,"ua",C.skin,C.skinD,"ua","sleeve",C.shirt,C.shirtD);
    lim(R.a1.el,R.a1.hand,"fa",C.skin,C.skinD,"fa");
    s.push(hotLater.join(""));
    if(R.handEnd) s.push(hand(add(R.a1.hand,ang(R.a1.hand,R.handEnd),3),ang(R.a1.hand,R.handEnd),C.skin));
    else s.push(hand(R.a1.hand,R.a1.fa,C.skin));
    return s.join("");
  }
  /* ---- top view rig (seen from above, facing up) ---- */
  function solveTop(P){
    const cx=120, cy=118, shR=[cx+21,cy], shL=[cx-21,cy];
    if(P.noArms){ P=Object.assign({},P,{ua:90,fa:90}); }
    const armR=P.handR?ik(shR,P.handR,L.ua,L.fa,P.abR==null?-1:P.abR):[P.ua,P.fa];
    const armL=P.handL?ik(shL,P.handL,L.ua,L.fa,P.abL==null?1:P.abL):[180-P.ua,180-P.fa];
    const elR=add(shR,armR[0],L.ua), hR=add(elR,armR[1],L.fa), elL=add(shL,armL[0],L.ua), hL=add(elL,armL[1],L.fa);
    let legs=null;
    if(P.leg!=null){ const hpR=[cx+11,cy+6], hpL=[cx-11,cy+6]; const kR=add(hpR,P.leg,40), kL=add(hpL,180-P.leg,40); legs={hpR,hpL,kR,kL}; }
    return {cx,cy,shR,shL,elR,hR,elL,hL,legs,noArms:!!P.noArms};
  }
  function drawTop(R,hot){
    const H=new Set(hot||[]); const s=[];
    s.push('<ellipse cx="'+R.cx+'" cy="'+(R.cy+6)+'" rx="40" ry="20" fill="#000" opacity=".3"/>');
    if(R.legs){ ["R","L"].forEach(k=>{ const hp=R.legs["hp"+k], kn=R.legs["k"+k]; s.push(seg(hp,kn,"th",C.skin,C.skinD), seg(hp,kn,"shorts",C.shorts), ci(kn,6.2,C.skin,' stroke="'+C.skinD+'"')); if(H.has("th")) s.push(hotShape(limbPath(hp,kn,PROF.th))); }); }
    if(!R.noArms){ [["shR","elR","hR"],["shL","elL","hL"]].forEach(([a,b,c])=>{ s.push(seg(R[a],R[b],"ua",C.skin,C.skinD), seg(R[a],R[b],"sleeve",C.shirt,C.shirtD), seg(R[b],R[c],"fa",C.skin,C.skinD), hand(R[c],ang(R[b],R[c]),C.skin)); if(H.has("ua")) s.push(hotShape(limbPath(R[a],R[b],PROF.ua))); }); }
    s.push('<ellipse cx="'+R.cx+'" cy="'+R.cy+'" rx="27" ry="13" fill="'+C.shirt+'" stroke="'+C.shirtD+'"/>');
    s.push('<path d="M'+(R.cx-24)+' '+(R.cy+3)+' Q'+R.cx+' '+(R.cy+11)+' '+(R.cx+24)+' '+(R.cy+3)+'" stroke="'+C.shirtD+'" stroke-width="1.2" fill="none" opacity=".6"/>');
    s.push('<ellipse cx="'+R.cx+'" cy="'+(R.cy-3)+'" rx="9" ry="10" fill="'+C.hair+'"/>'+'<ellipse cx="'+R.cx+'" cy="'+(R.cy-11)+'" rx="3.2" ry="2.4" fill="'+C.skin+'"/>');
    if(H.has("torso")) s.push('<ellipse cx="'+R.cx+'" cy="'+R.cy+'" rx="27" ry="13" fill="'+C.hot+'" opacity=".45" filter="url(#fHot)"/>');
    return s.join("");
  }
  /* ---- front view rig (lateral raise) ---- */
  function solveFront(P){
    const cx=120, sy=78, shR=[cx+20,sy], shL=[cx-20,sy];
    const elR=add(shR,P.a,L.ua), hR=add(elR,P.a+P.bend,L.fa), elL=add(shL,180-P.a,L.ua), hL=add(elL,180-P.a-P.bend,L.fa);
    return {cx,sy,shR,shL,elR,hR,elL,hL};
  }
  function drawFront(R,hot){
    const H=new Set(hot||[]); const s=[]; const hip=[R.cx,R.sy+46];
    s.push('<ellipse cx="'+R.cx+'" cy="187" rx="34" ry="3" fill="#000" opacity=".35"/>');
    [-1,1].forEach(k=>{ const hp=[R.cx+11*k,hip[1]], kn=[R.cx+15*k,hip[1]+22], an=[R.cx+16*k,hip[1]+58];
      s.push(seg(kn,an,"sh",C.skin,C.skinD), seg(hp,kn,"th",C.skin,C.skinD), seg(hp,kn,"shorts",C.shorts), ln([an[0],an[1]+2],[an[0]+5*k,an[1]+3],7,C.shoe)); });
    s.push('<path d="M'+(R.cx-14)+' '+hip[1]+' L'+(R.cx+14)+' '+hip[1]+' L'+(R.cx+15)+' '+(hip[1]+10)+' L'+(R.cx-15)+' '+(hip[1]+10)+' Z" fill="'+C.shorts+'"/>');
    s.push(seg([R.cx,R.sy-4],[R.cx,R.sy-13],"fa",C.skin,C.skinD));
    s.push('<path d="M'+(R.cx-23)+' '+(R.sy-3)+' Q'+R.cx+' '+(R.sy-9)+' '+(R.cx+23)+' '+(R.sy-3)+' L'+(R.cx+17)+' '+(R.sy+26)+' L'+(R.cx+14)+' '+hip[1]+' L'+(R.cx-14)+' '+hip[1]+' L'+(R.cx-17)+' '+(R.sy+26)+' Z" fill="'+C.shirt+'" stroke="'+C.shirtD+'"/>');
    [["shR","elR","hR"],["shL","elL","hL"]].forEach(([a,b,c])=>{ s.push(seg(R[a],R[b],"ua",C.skin,C.skinD), seg(R[a],R[b],"sleeve",C.shirt,C.shirtD), seg(R[b],R[c],"fa",C.skin,C.skinD), hand(R[c],ang(R[b],R[c]),C.skin)); });
    if(H.has("ua")) s.push(ci(R.shR,8,C.hot,' opacity=".45" filter="url(#fHot)"')+ci(R.shL,8,C.hot,' opacity=".45" filter="url(#fHot)"'));
    const hc=[R.cx,R.sy-23];
    s.push('<ellipse cx="'+hc[0]+'" cy="'+hc[1]+'" rx="9" ry="10.4" fill="'+C.skin+'" stroke="'+C.skinD+'"/>'+'<path d="M'+(hc[0]-9.2)+' '+(hc[1]-1)+' Q'+(hc[0]-9)+' '+(hc[1]-12.5)+' '+hc[0]+' '+(hc[1]-11.5)+' Q'+(hc[0]+9)+' '+(hc[1]-12.5)+' '+(hc[0]+9.2)+' '+(hc[1]-1)+' Q'+hc[0]+' '+(hc[1]-7)+' '+(hc[0]-9.2)+' '+(hc[1]-1)+' Z" fill="'+C.hair+'"/>'+ci([hc[0]-3.2,hc[1]+0.5],1,"#2A2522")+ci([hc[0]+3.2,hc[1]+0.5],1,"#2A2522"));
    return s.join("");
  }
  function backPad(R,s0,e0){ const o=add(R.hip,R.t-90,15); return pad(add(o,R.t,s0),add(o,R.t,e0),11); }
  /* ---- exercise library ---- */
  const stand={x:118,y:110,t:-90,th:90,sh:90};
  const E={
    bike:{view:"side",hot:["th","sh"],cycle:true,
      pose:(t)=>{ const c=[132,162], r=13, a=t*360; return {x:94,y:108,t:-76,hand:[150,72],hand2:[150,74],ab:1,ab2:1,ankle:add(c,a,r),ankle2:add(c,a+180,r),lb:-1,lb2:-1}; },
      back:(R)=>ln([96,118],[96,150],6,C.eq)+ln([96,150],[132,162],6,C.eq)+ln([132,162],[154,72],6,C.eq)+ln([148,72],[160,72],6,C.eqL)+ln([84,114],[106,114],7,C.eqL)+ci([132,162],15,"none",' stroke="'+C.eqL+'" stroke-width="2"')+ln([70,186],[170,186],8,C.eq),
      front:(R)=>ci([132,162],4,C.eqL)},
    bulgarian:{view:"side",hot:["th"],A:{x:112,y:96,t:-88,ankle:[140,182],ankle2:[72,150],lb2:-1,ft2:-150,ua:94,fa:92,ua2:94,fa2:92},B:{x:110,y:126,t:-84,ankle:[140,182],ankle2:[72,150],lb2:-1,ft2:-150,ua:94,fa:92,ua2:94,fa2:92},
      back:()=>floor()+rc(44,148,44,8,3,C.eq)+ln([50,156],[50,186],5,C.eq)+ln([82,156],[82,186],5,C.eq),
      front:(R)=>dumbbell(R.a1.hand,0)},
    goblet:{view:"side",hot:["th"],A:{...stand,ankle:[118,182],handRel:[16,14],ab:1},B:{x:102,y:138,t:-70,ankle:[118,182],handRel:[16,14],ab:1},
      back:()=>floor(),front:(R)=>dumbbell(R.a1.hand,90)},
    reverse_lunge:{view:"side",hot:["th"],A:{...stand,ua:94,fa:92,ankle:[122,182],ankle2:[116,182],ft2:0},B:{x:108,y:132,t:-88,ua:94,fa:92,ankle:[136,182],ankle2:[62,182],lb2:-1,ft2:-40},
      back:()=>floor(),front:()=>""},
    pendulum:{view:"side",hot:["th"],A:{x:112,y:102,t:-80,ankle:[142,170],ua:110,fa:60},B:{x:96,y:132,t:-70,ankle:[142,170],ua:110,fa:60},
      back:(R)=>floor()+ln([150,176],[120,176],6,C.eq)+ln(add(R.hip,R.t+180,8),add(R.sh,R.t+180,8),8,C.eq)+pad(add(R.sh,R.t+150,6),add(R.sh,R.t+30,10),8),front:()=>""},
    leg_press:{view:"side",hot:["th"],A:{x:72,y:150,t:-150,ankle:[124,112],ua:20,fa:40},B:{x:72,y:150,t:-150,ankle:[156,82],ua:20,fa:40},
      back:(R)=>floor()+ln([40,170],[100,170],6,C.eq)+backPad(R,-8,56)+ln([86,164],[196,54],5,C.eqL),
      front:(R)=>{ const p=R.l1.ankle; return ln(add(p,-45+90,-6),add(p,-45-90,24),7,C.eqL)+ln(add(p,-45+90,-6),add(p,-45-90,24),3,C.eq); }},
    leg_ext:{view:"side",hot:["th"],A:{x:92,y:120,t:-96,th:0,sh:92,ua:100,fa:20},B:{x:92,y:120,t:-96,th:0,sh:8,ua:100,fa:20},
      back:(R)=>floor()+rc(70,124,58,8,3,C.pad,C.padS)+ln([80,132],[80,186],6,C.eq)+backPad(R,-4,52)+ln([128,124],[128,186],5,C.eq),
      front:(R)=>ci(add(R.l1.ankle,R.l1.sh+180,4),5,C.eqL)+ln(R.l1.knee,add(R.l1.ankle,R.l1.sh+180,4),3,C.eqL)},
    leg_curl:{view:"side",hot:["th"],A:{x:92,y:120,t:-96,th:0,sh:12,ua:100,fa:20},B:{x:92,y:120,t:-96,th:0,sh:100,ua:100,fa:20},
      back:(R)=>floor()+rc(70,124,58,8,3,C.pad,C.padS)+ln([80,132],[80,186],6,C.eq)+backPad(R,-4,52),
      front:(R)=>pad([104,110],[124,110],9)+ci(add(R.l1.ankle,R.l1.sh-180,-2),5,C.eqL)+ln(R.l1.knee,add(R.l1.ankle,R.l1.sh,2),3,C.eqL)},
    calf_raise:{view:"side",hot:["sh"],A:{x:118,y:114,t:-90,th:90,sh:90,ft:15,ua:92,fa:90},B:{x:121,y:102,t:-90,th:90,sh:90,ft:58,ua:92,fa:90},
      back:()=>floor()+rc(122,182,40,6,1,C.eq),front:()=>""},
    kickback:{view:"side",hot:["th"],A:{x:112,y:110,t:-82,th:92,sh:92,th2:92,sh2:92,handRel:[38,30],ab:1},B:{x:112,y:110,t:-82,th:150,sh:120,th2:92,sh2:92,handRel:[38,30],ab:1},
      back:()=>floor()+ln([168,30],[168,186],6,C.eq)+ln([162,90],[176,90],6,C.eqL),front:(R)=>cable([170,180],R.l1.ankle)+ci(R.l1.ankle,4,C.eqL)},
    incline_db:{view:"side",hot:["ua","torso"],A:{x:96,y:132,t:-150,th:12,sh:90,handRel:[10,-8],ab:1},B:{x:96,y:132,t:-150,th:12,sh:90,handRel:[4,-48],ab:1},
      back:(R)=>floor()+backPad(R,-8,56)+rc(86,134,34,7,3,C.pad,C.padS)+ln([100,141],[100,186],6,C.eq)+ln([60,110],[52,186],5,C.eq),
      front:(R)=>dumbbell(R.a1.hand,0)},
    chest_press:{view:"side",hot:["ua","torso"],A:{x:84,y:126,t:-94,th:2,sh:90,handRel:[16,6],ab:1},B:{x:84,y:126,t:-94,th:2,sh:90,handRel:[50,6],ab:1},
      back:(R)=>floor()+backPad(R,-4,52)+rc(70,128,44,7,3,C.pad,C.padS)+ln([86,135],[86,186],6,C.eq)+ln([196,40],[196,186],6,C.eq),
      front:(R)=>ln([196,60],R.a1.hand,4,C.eqL)+ln([R.a1.hand[0],R.a1.hand[1]-6],[R.a1.hand[0],R.a1.hand[1]+8],5,C.eqL)},
    gravitron:{view:"side",hot:["ua"],A:{x:112,y:112,t:-90,th:92,sh:150,hand:[124,28],ab:1},B:{x:112,y:90,t:-90,th:92,sh:150,hand:[124,28],ab:1},
      back:(R)=>ln([60,24],[180,24],6,C.eq)+ln([170,24],[170,186],6,C.eq)+floor(),
      front:(R)=>{ const k=R.l1.knee; return pad([k[0]-14,k[1]+7],[k[0]+18,k[1]+7],9)+ln([k[0]+18,k[1]+7],[170,k[1]+7],4,C.eqL); }},
    hammer_pulldown:{view:"side",hot:["ua"],A:{x:96,y:138,t:-96,th:0,sh:92,handRel:[10,-48],ab:1},B:{x:96,y:138,t:-96,th:0,sh:92,handRel:[16,-2],ab:1},
      back:()=>floor()+rc(76,142,40,7,3,C.pad,C.padS)+ln([90,149],[90,186],6,C.eq)+ln([60,20],[60,186],6,C.eq)+ln([60,20],[140,20],6,C.eq),
      front:(R)=>pad([112,130],[134,130],8)+ln([70,24],R.a1.hand,4,C.eqL)+ci(R.a1.hand,4,C.eqL)},
    cable_row:{view:"side",hot:["ua","torso"],A:{x:70,y:150,t:-86,ankle:[150,164],handRel:[50,22],ab:1},B:{x:70,y:150,t:-90,ankle:[150,164],handRel:[8,32],ab:-1},
      back:()=>floor()+rc(40,154,60,8,3,C.pad,C.padS)+ln([156,150],[156,178],6,C.eqL)+ln([200,60],[200,186],6,C.eq)+stack(204,90,90,0),
      front:(R)=>cable([200,140],R.a1.hand)+ln([R.a1.hand[0],R.a1.hand[1]-5],[R.a1.hand[0],R.a1.hand[1]+5],5,C.eqL)},
    rope_pushdown:{view:"side",hot:["fa"],A:{x:112,y:110,t:-86,th:92,sh:90,ua:96,fa:-30},B:{x:112,y:110,t:-86,th:92,sh:90,ua:96,fa:88},
      back:()=>floor()+ln([166,18],[166,186],6,C.eq)+ln([150,18],[172,18],6,C.eq),front:(R)=>cable([152,22],R.a1.hand)+ci(R.a1.hand,4,C.eqL)},
    triceps_machine:{view:"side",hot:["fa"],A:{x:84,y:126,t:-94,th:2,sh:90,ua:-10,fa:-80},B:{x:84,y:126,t:-94,th:2,sh:90,ua:-10,fa:0},
      back:(R)=>floor()+ln([74,132],[74,64],9,C.pad)+rc(70,128,44,7,3,C.pad,C.padS)+ln([86,135],[86,186],6,C.eq),
      front:(R)=>pad(add(R.sh,-10,6),add(R.sh,-10,30),8)+ci(R.a1.hand,5,C.eqL)},
    incline_curl:{view:"side",hot:["fa","ua"],A:{x:92,y:132,t:-128,th:12,sh:90,ua:96,fa:94,ua2:96,fa2:-62},B:{x:92,y:132,t:-128,th:12,sh:90,ua:96,fa:-62,ua2:96,fa2:94},
      back:(R)=>floor()+backPad(R,-8,56)+rc(82,134,34,7,3,C.pad,C.padS)+ln([96,141],[96,186],6,C.eq)+ln([66,100],[54,186],5,C.eq),
      front:(R)=>dumbbell(R.a1.hand,R.a1.fa+90)+dumbbell(R.a2.hand,R.a2.fa+90)},
    hammer:{view:"side",hot:["fa"],A:{...stand,ua:92,fa:90},B:{...stand,ua:94,fa:-48},back:()=>floor(),front:(R)=>dumbbell(R.a1.hand,R.a1.fa)},
    bb_curl:{view:"side",hot:["fa","ua"],A:{...stand,ua:92,fa:88},B:{...stand,ua:96,fa:-52},back:()=>floor(),front:(R)=>plate(R.a1.hand)},
    reverse_curl:{view:"side",hot:["fa"],A:{...stand,ua:92,fa:88},B:{...stand,ua:96,fa:-40},back:()=>floor(),front:(R)=>plate(R.a1.hand)},
    wrist_curl:{view:"side",hot:["fa","hd"],A:{...stand,ua:100,fa:96,hd:70},B:{...stand,ua:100,fa:96,hd:150},back:()=>floor(),front:(R)=>plate(R.handEnd)},
    lateral:{view:"front",hot:["ua"],A:{a:84,bend:-8},B:{a:4,bend:-14},
      back:(R)=>ln([R.cx-34,40],[R.cx+34,40],0,C.eq)+rc(R.cx-26,30,52,96,6,C.pad,C.padS)+ln([R.cx,126],[R.cx,186],6,C.eq)+floor(),
      front:(R)=>pad(add(R.elR,0,-2),add(R.elR,0,4),12)+pad(add(R.elL,0,-4),add(R.elL,0,2),12)},
    pec_deck:{view:"top",hot:["ua"],A:{ua:-8,fa:-78},B:{ua:-62,fa:-118},
      back:(R)=>rc(R.cx-34,R.cy+10,68,22,6,C.pad,C.padS),front:(R)=>pad(R.elR,R.hR,11)+pad(R.elL,R.hL,11)},
    rear_delt:{view:"top",hot:["ua"],A:{handR:[132,70],handL:[108,70],abR:-1,abL:1},B:{handR:[188,108],handL:[52,108],abR:-1,abL:1},
      back:(R)=>rc(R.cx-30,R.cy-46,60,20,6,C.pad,C.padS),front:(R)=>ci(R.hR,5,C.eqL)+ci(R.hL,5,C.eqL)},
    abduction:{view:"top",hot:["th"],A:{noArms:1,leg:-86},B:{noArms:1,leg:-58},
      back:(R)=>rc(R.cx-34,R.cy-4,68,26,6,C.pad,C.padS),front:(R)=>pad(add(R.legs.kR,0,-2),add(R.legs.kR,0,10),12)+pad(add(R.legs.kL,0,2),add(R.legs.kL,0,-10),12)},
    adduction:{view:"top",hot:["th"],A:{noArms:1,leg:-58},B:{noArms:1,leg:-86},
      back:(R)=>rc(R.cx-34,R.cy-4,68,26,6,C.pad,C.padS),front:(R)=>pad(add(R.legs.kR,0,-12),add(R.legs.kR,0,-2),12)+pad(add(R.legs.kL,0,12),add(R.legs.kL,0,2),12)},
    pallof:{view:"top",hot:["torso"],A:{handR:[124,98],handL:[116,98]},B:{handR:[123,58],handL:[117,58]},
      back:()=>ln([18,40],[18,180],6,C.eq),front:(R)=>cable([22,100],[(R.hR[0]+R.hL[0])/2,(R.hR[1]+R.hL[1])/2])+ci([(R.hR[0]+R.hL[0])/2,(R.hR[1]+R.hL[1])/2],5,C.eqL)}
  };
  function frame(id,t){
    const ex=E[id]; if(!ex) return null;
    const e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; // ease
    let P=ex.cycle?ex.pose(t):mix(ex.A,ex.B,e);
    let body="", R;
    if(ex.view==="side"){ R=solveSide(P); body=drawSide(R,ex.hot); }
    else if(ex.view==="top"){ R=solveTop(P); body=drawTop(R,ex.hot); }
    else { R=solveFront(P); body=drawFront(R,ex.hot); }
    return '<svg viewBox="0 0 240 200" class="anim-svg" role="img">'+DEFS+'<rect width="240" height="200" fill="url(#gBg)"/>'+(ex.back?ex.back(R,t):"")+body+(ex.front?ex.front(R,t):"")+'</svg>';
  }
  return {has:id=>!!E[id], frame, view:id=>E[id]&&E[id].view, cycle:id=>!!(E[id]&&E[id].cycle)};
})();
