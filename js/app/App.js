"use strict";

// Kontrol utama aplikasi: tombol, event, kamera, rute, dan animasi.

class App {
  constructor(){
    try{
      this.bgC=document.getElementById('bgCanvas');
      this.fgC=document.getElementById('fgCanvas');
      this.bgX=this.bgC.getContext('2d');
      this.fgX=this.fgC.getContext('2d');
      this.off=document.createElement('canvas');
      this.mapW=MAP_W; this.mapH=MAP_H; this.mapCX=this.mapW/2; this.mapCY=this.mapH/2;
      this.off.width=this.mapW; this.off.height=this.mapH;
      this.offX=this.off.getContext('2d');
      this.renderer=new Renderer(this.offX,this.fgX);
      this.cam={x:this.mapCX,y:this.mapCY,z:0.78,tx:this.mapCX,ty:this.mapCY,tz:0.78,hoverId:null};
      this.startId=null; this.endId=null; this.result=null;
      this.vehicle=new Vehicle();
      this.vehiclePath=new VehiclePath(this);
      this.vehicleAnimation=new VehicleAnimation(this);
      this.activeMapIndex=0;
      this.mapImage = makeCustomMapImage(this.activeMapIndex);
      this.city=null; this.manualMode=false;
      this.uiController=new UIController(this);
      this.resize();
      window.addEventListener('resize',()=>this.resize());
      this.uiController.init();

      const hideSplash=()=>{
        const sp=document.getElementById('splash');
        if(!sp || sp.style.display==='none') return;
        sp.classList.add('hide');
        setTimeout(()=>{ sp.style.display='none'; },360);
      };

      const startApp=()=>{
        try{
          this._gen();
          this._fitCamera();
          this.msg('Peta final SVG siap. Edge dan node sudah dipasang di centerline jalan.');
        }catch(err){
          console.error(err);
          this.msg('Gagal memuat peta: '+err.message);
        }finally{
          hideSplash();
          requestAnimationFrame(()=>this.loop());
        }
      };

      const boot = () => requestAnimationFrame(()=>setTimeout(startApp,20));
      if(this.mapImage.complete) boot();
      else {
        this.mapImage.onload = boot;
        this.mapImage.onerror = () => {
          console.error('Gagal memuat SVG peta final.');
          boot();
        };
      }
    }catch(e){
      console.error(e);
      document.getElementById('splash').style.display='none';
      alert('Error: '+e.message);
    }
  }

  resize(){
    this.bgC.width=this.fgC.width=window.innerWidth;
    this.bgC.height=this.fgC.height=window.innerHeight;
    if(this.city) this._fitCamera(false);
  }

  _fitCamera(animate=true){
    const sx=this.bgC.width/this.mapW;
    const sy=this.bgC.height/this.mapH;
    const z=Math.min(sx,sy)*0.90;
    if(animate){
      this.cam.tx=this.mapCX;
      this.cam.ty=this.mapCY;
      this.cam.tz=z;
      this._clampCamera();
    }else{
      this.cam.x=this.cam.tx=this.mapCX;
      this.cam.y=this.cam.ty=this.mapCY;
      this.cam.z=this.cam.tz=z;
      this._clampCamera();
      this.cam.x=this.cam.tx;
      this.cam.y=this.cam.ty;
      this.cam.z=this.cam.tz;
    }
  }

  _clampCamera(){
    if(!this.cam || !this.bgC || !this.mapW || !this.mapH) return;

    if(!Number.isFinite(this.cam.tz)) this.cam.tz=0.78;
    this.cam.tz=Math.max(0.25,Math.min(3.5,this.cam.tz));

    if(!Number.isFinite(this.cam.tx)) this.cam.tx=this.mapCX;
    if(!Number.isFinite(this.cam.ty)) this.cam.ty=this.mapCY;
    if(!Number.isFinite(this.cam.x)) this.cam.x=this.cam.tx;
    if(!Number.isFinite(this.cam.y)) this.cam.y=this.cam.ty;
    if(!Number.isFinite(this.cam.z)) this.cam.z=this.cam.tz;

    const viewW=this.bgC.width/this.cam.tz;
    const viewH=this.bgC.height/this.cam.tz;

    const clampAxis=(value,mapSize,viewSize,center)=>{
      if(viewSize>=mapSize) return center;
      const min=viewSize/2;
      const max=mapSize-viewSize/2;
      return Math.max(min,Math.min(max,value));
    };

    this.cam.tx=clampAxis(this.cam.tx,this.mapW,viewW,this.mapCX);
    this.cam.ty=clampAxis(this.cam.ty,this.mapH,viewH,this.mapCY);
  }

  _currentMapVariant(){
    return MAP_SVG_VARIANTS[((this.activeMapIndex % MAP_SVG_VARIANTS.length) + MAP_SVG_VARIANTS.length) % MAP_SVG_VARIANTS.length];
  }

  _useMapVariant(index){
    this.activeMapIndex=((index % MAP_SVG_VARIANTS.length) + MAP_SVG_VARIANTS.length) % MAP_SVG_VARIANTS.length;
    this.mapImage = makeCustomMapImage(this.activeMapIndex);
    this.result=null;
    this.vehicle.visible=false;
    const rebuild=()=>{
      this._gen();
      this._fitCamera();
      this.msg('Peta dibuat ulang: ' + this._currentMapVariant().name + '.');
    };
    if(this.mapImage.complete) rebuild();
    else {
      this.mapImage.onload=rebuild;
      this.mapImage.onerror=()=>{ this.msg('Gagal memuat ' + this._currentMapVariant().name + '.'); rebuild(); };
    }
  }

  _gen(){
    this.msg('Membuat ulang peta ' + this._currentMapVariant().name + ' tanpa mengubah sistem Dijkstra dan anti-drift track...');
    this.city=new CustomCity().generate();
    this.city.mapImage = this.mapImage;
    this.off.width=this.mapW; this.off.height=this.mapH;
    this.offX.clearRect(0,0,this.mapW,this.mapH);
    this.renderer.renderBg(this.city);
    this._snapGraphToRoadMask();
    this._buildRoadNavigation();
    this._centerGraphOnSafeRoad();

    // Setelah node digeser ke badan jalan, geometri edge harus dihitung ulang.
    // Kalau tidak, Dijkstra bisa kehilangan edge pendek dan memilih rute memutar.
    this._refreshGraphGeometry();
    this._repairGraphForRoadMask();
    this._addSafeGraphConnectors();
    this._refreshGraphGeometry();

    this._auto();
  }

  _isRoadPixel(data, idx){
    const r=data[idx], g=data[idx+1], b=data[idx+2], a=data[idx+3];
    if(a<200) return false;
    const max=Math.max(r,g,b);
    const min=Math.min(r,g,b);
    const sat=max-min;
    // Jalan pada SVG adalah area abu-abu rendah saturasi.
    // Batas bawah dibuat lebih terang agar atap/bangunan abu-abu gelap tidak ikut dianggap jalan.
    return sat<=24 && r>=108 && r<=190 && g>=108 && g<=190 && b>=104 && b<=190;
  }

  _nearestRoadPoint(x,y,img,w,h,radius){
    const data=img.data;
    const ix=Math.round(x), iy=Math.round(y);
    const startX=Math.max(0,ix-radius);
    const endX=Math.min(w-1,ix+radius);
    const startY=Math.max(0,iy-radius);
    const endY=Math.min(h-1,iy+radius);

    let best=null, bestD=Infinity;
    let sumX=0, sumY=0, weight=0;
    for(let py=startY;py<=endY;py++){
      for(let px=startX;px<=endX;px++){
        const dx=px-x, dy=py-y;
        const d2=dx*dx+dy*dy;
        if(d2>radius*radius) continue;
        const idx=(py*w+px)*4;
        if(!this._isRoadPixel(data,idx)) continue;
        if(d2<bestD){bestD=d2;best={x:px,y:py};}
        const d=Math.sqrt(d2);
        if(d<=26){
          const wt=1/(1+d);
          sumX+=px*wt;
          sumY+=py*wt;
          weight+=wt;
        }
      }
    }

    if(weight>0) return {x:sumX/weight,y:sumY/weight};
    return best;
  }

  _snapGraphToRoadMask(){
    if(!this.city) return;
    let img;
    try{
      img=this.offX.getImageData(0,0,this.mapW,this.mapH);
    }catch(err){
      console.warn('Road mask tidak bisa dibaca:', err);
      return;
    }

    let snapped=0;
    for(const n of this.city.graph.nodes.values()){
      const p=this._nearestRoadPoint(n.x,n.y,img,this.mapW,this.mapH,54);
      if(!p) continue;
      if(Math.hypot(p.x-n.x,p.y-n.y)>0.5) snapped++;
      n.x=p.x;
      n.y=p.y;
    }

    for(const meta of this.city.nodesMeta){
      const n=this.city.graph.nodes.get(meta.id);
      if(n){ meta.x=n.x; meta.y=n.y; }
    }

    for(const edge of this.city.graph.edges){
      const a=this.city.graph.nodes.get(edge.a);
      const b=this.city.graph.nodes.get(edge.b);
      if(a&&b) edge.dist=Math.hypot(a.x-b.x,a.y-b.y);
    }

    console.info('Graph route snapped to road mask:', snapped, 'nodes adjusted.');
  }

  _buildRoadNavigation(){
    let img;
    try{
      img=this.offX.getImageData(0,0,this.mapW,this.mapH);
    }catch(err){
      console.warn('Road navigation mask tidak bisa dibaca:', err);
      this.roadNav=null;
      return;
    }

    const w=this.mapW, h=this.mapH, total=w*h;
    const mask=new Uint8Array(total);
    for(let i=0,p=0;i<img.data.length;i+=4,p++){
      mask[p]=this._isRoadPixel(img.data,i) ? 1 : 0;
    }

    const inf=32000;
    const dist=new Int16Array(total);
    for(let i=0;i<total;i++) dist[i]=mask[i] ? inf : 0;

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const idx=y*w+x;
        if(!mask[idx]) continue;
        let d=dist[idx];
        if(x>0) d=Math.min(d,dist[idx-1]+1);
        if(y>0) d=Math.min(d,dist[idx-w]+1);
        if(x>0&&y>0) d=Math.min(d,dist[idx-w-1]+2);
        if(x<w-1&&y>0) d=Math.min(d,dist[idx-w+1]+2);
        dist[idx]=d;
      }
    }
    for(let y=h-1;y>=0;y--){
      for(let x=w-1;x>=0;x--){
        const idx=y*w+x;
        if(!mask[idx]) continue;
        let d=dist[idx];
        if(x<w-1) d=Math.min(d,dist[idx+1]+1);
        if(y<h-1) d=Math.min(d,dist[idx+w]+1);
        if(x<w-1&&y<h-1) d=Math.min(d,dist[idx+w+1]+2);
        if(x>0&&y<h-1) d=Math.min(d,dist[idx+w-1]+2);
        dist[idx]=d;
      }
    }

    this.roadNav={mask,dist,w,h,step:4,safe:7};
  }

  _roadClearance(x,y){
    if(!this.roadNav) return 0;
    const px=Math.max(0,Math.min(this.roadNav.w-1,Math.round(x)));
    const py=Math.max(0,Math.min(this.roadNav.h-1,Math.round(y)));
    return this.roadNav.dist[py*this.roadNav.w+px] || 0;
  }

  _isSafeRoadPoint(x,y,safe){
    return this._roadClearance(x,y)>=safe;
  }

  _nearestSafeRoadPoint(x,y,safe,radius=90){
    if(!this.roadNav) return null;
    const {w,h,step}=this.roadNav;
    let best=null, bestScore=Infinity;
    for(let r=0;r<=radius;r+=step){
      const minX=Math.max(0,Math.round(x-r));
      const maxX=Math.min(w-1,Math.round(x+r));
      const minY=Math.max(0,Math.round(y-r));
      const maxY=Math.min(h-1,Math.round(y+r));
      for(let py=minY;py<=maxY;py+=step){
        for(let px=minX;px<=maxX;px+=step){
          if(!this._isSafeRoadPoint(px,py,safe)) continue;
          const score=Math.hypot(px-x,py-y)-this._roadClearance(px,py)*0.12;
          if(score<bestScore){bestScore=score;best={x:px,y:py};}
        }
      }
      if(best) return best;
    }
    return null;
  }

  _centerGraphOnSafeRoad(){
    // START dan FINISH harus berada di badan jalan, bukan di tepi jalan.
    // Setelah mask jalan dibuat, semua node digeser lagi ke titik jalan yang lebih aman.
    if(!this.city || !this.roadNav) return;

    const preferredSafe=this.roadNav.safe || 7;
    let moved=0;

    for(const n of this.city.graph.nodes.values()){
      let q=null;
      if(!this._isSafeRoadPoint(n.x,n.y,preferredSafe)){
        for(const safe of [preferredSafe,7,6,5,4,3,2,1]){
          q=this._nearestSafeRoadPoint(n.x,n.y,safe,130);
          if(q) break;
        }
      }

      if(q){
        if(Math.hypot(q.x-n.x,q.y-n.y)>0.5) moved++;
        n.x=q.x;
        n.y=q.y;
      }
    }

    for(const meta of this.city.nodesMeta){
      const n=this.city.graph.nodes.get(meta.id);
      if(n){ meta.x=n.x; meta.y=n.y; }
    }

    for(const edge of this.city.graph.edges){
      const a=this.city.graph.nodes.get(edge.a);
      const b=this.city.graph.nodes.get(edge.b);
      if(a&&b) edge.dist=Math.hypot(a.x-b.x,a.y-b.y);
    }

    console.info('Graph nodes centered on safe road:', moved, 'nodes adjusted.');
  }

  _refreshGraphGeometry(){
    if(!this.city || !this.city.graph) return;

    if(!Array.isArray(this.city.curvedSegs)) this.city.curvedSegs=[];
    const segMap=new Map();
    for(const s of this.city.curvedSegs){
      if(s && s.from && s.to) segMap.set(s.from + '|' + s.to, s);
    }

    for(const edge of this.city.graph.edges){
      const a=this.city.graph.nodes.get(edge.a);
      const b=this.city.graph.nodes.get(edge.b);
      if(!a || !b) continue;

      const d=Math.hypot(b.x-a.x,b.y-a.y);
      edge.dist=Math.max(1,d);

      const key=edge.a + '|' + edge.b;
      let seg=segMap.get(key);
      if(!seg){
        seg={from:edge.a,to:edge.b};
        this.city.curvedSegs.push(seg);
        segMap.set(key,seg);
      }

      // Graph memakai banyak titik kecil mengikuti centerline jalan.
      // Kontrol Bezier disamakan ke ujung edge agar tiap edge tetap pendek,
      // aman, dan bobotnya sesuai jarak sebenarnya.
      seg.c1x=a.x;
      seg.c1y=a.y;
      seg.c2x=b.x;
      seg.c2y=b.y;
      seg.cpx=(a.x+b.x)/2;
      seg.cpy=(a.y+b.y)/2;
    }
  }

  _edgeKey(a,b){
    return a < b ? a + '|' + b : b + '|' + a;
  }

  _addSafeGraphConnectors(){
    if(!this.city || !this.city.graph || !this.roadNav) return 0;

    const graph=this.city.graph;
    const maxGap=18;
    const safe=3;
    const cell=maxGap;
    const buckets=new Map();
    const existing=new Set();

    for(const e of graph.edges){
      existing.add(this._edgeKey(e.a,e.b));
    }

    const bucketId=(x,y)=>Math.floor(x/cell) + ',' + Math.floor(y/cell);
    const nodes=Array.from(graph.nodes.values()).filter(n=>{
      return n && n.adj && n.adj.length>0 && this._roadClearance(n.x,n.y)>=safe;
    });

    let added=0;

    for(const n of nodes){
      const gx=Math.floor(n.x/cell);
      const gy=Math.floor(n.y/cell);

      for(let oy=-1; oy<=1; oy++){
        for(let ox=-1; ox<=1; ox++){
          const list=buckets.get((gx+ox) + ',' + (gy+oy));
          if(!list) continue;

          for(const other of list){
            if(other.id===n.id) continue;

            const d=Math.hypot(other.x-n.x,other.y-n.y);
            if(d<2.2 || d>maxGap) continue;

            const key=this._edgeKey(n.id,other.id);
            if(existing.has(key)) continue;

            // Konektor hanya dibuat jika garis pendeknya tetap berada di badan jalan.
            // Ini menyambungkan node persimpangan yang secara visual berdekatan
            // tetapi sebelumnya tidak tersambung di graph.
            if(!this._routeLineIsSafe(n,other,safe,2)) continue;

            graph.addEdge(n.id,other.id,Math.max(1,d*1.01));
            existing.add(key);
            added++;
          }
        }
      }

      const id=bucketId(n.x,n.y);
      if(!buckets.has(id)) buckets.set(id,[]);
      buckets.get(id).push(n);
    }

    if(added) console.info('Safe Dijkstra connectors added:', added);
    return added;
  }

  _optimizeSelectedEndpoints(){
    if(!this.city || !this.startId || !this.endId) return false;

    const graph=this.city.graph;
    const startBase=graph.nodes.get(this.startId);
    const endBase=graph.nodes.get(this.endId);
    if(!startBase || !endBase) return false;

    const nearby=(base)=>{
      const list=[];
      for(const n of graph.nodes.values()){
        if(!n || !n.adj || !n.adj.length) continue;
        const d=Math.hypot(n.x-base.x,n.y-base.y);
        if(d<=34 && (!this.roadNav || this._roadClearance(n.x,n.y)>=2)){
          list.push({id:n.id,node:n,offset:d});
        }
      }
      list.sort((a,b)=>a.offset-b.offset);
      return list.slice(0,18);
    };

    const starts=nearby(startBase);
    const ends=nearby(endBase);
    if(!starts.length || !ends.length) return false;

    const dijkstra=new Dijkstra(graph);
    let best=null;

    for(const s of starts){
      for(const e of ends){
        if(s.id===e.id) continue;
        const route=dijkstra.find(s.id,e.id);
        if(!route?.path || route.path.length<2 || !Number.isFinite(route.totalDist)) continue;

        // Penalti offset kecil menjaga titik tetap dekat dengan klik pengguna,
        // tetapi tetap boleh pindah ke node tetangga jika rutenya jauh lebih pendek.
        const score=route.totalDist + (s.offset + e.offset) * 4;
        if(!best || score<best.score){
          best={startId:s.id,endId:e.id,score};
        }
      }
    }

    if(!best) return false;
    this.startId=best.startId;
    this.endId=best.endId;
    this._forceNodeToRoad(this.startId);
    this._forceNodeToRoad(this.endId);
    return true;
  }

  _smoothRoadPoints(points,safe){
    if(!points || points.length<3) return points || [];
    const lineSafe=(a,b,extra=0)=>this._routeLineIsSafe(a,b,Math.max(1,safe+extra),2);

    const simplify=(src,extra=0)=>{
      const out=[src[0]];
      let anchor=0;
      while(anchor<src.length-1){
        let next=anchor+1;
        for(let test=src.length-1;test>anchor+1;test--){
          if(lineSafe(src[anchor],src[test],extra)){
            next=test;
            break;
          }
        }
        out.push(src[next]);
        anchor=next;
      }
      return out;
    };

    let out=simplify(points,1);
    for(let pass=0;pass<2;pass++){
      const relaxed=[out[0]];
      for(let i=1;i<out.length-1;i++){
        const a=relaxed[relaxed.length-1];
        const b=out[i];
        const c=out[i+1];
        const mid={x:(a.x+c.x)/2,y:(a.y+c.y)/2};
        const q=this._nearestSafeRoadPoint(mid.x,mid.y,Math.max(1,safe),18) || b;
        if(lineSafe(a,q,0) && lineSafe(q,c,0)) relaxed.push(q);
        else relaxed.push(b);
      }
      relaxed.push(out[out.length-1]);
      out=simplify(relaxed,0);
    }
    return this._cleanRoutePoints(out,1.0);
  }

  _astarRoadRoute(start,end,safe){
    if(!this.roadNav) return null;
    const {w,h,step}=this.roadNav;
    const cols=Math.floor(w/step)+1;
    const rows=Math.floor(h/step)+1;
    const toId=(gx,gy)=>gy*cols+gx;
    const toGrid=(p)=>({
      gx:Math.max(0,Math.min(cols-1,Math.round(p.x/step))),
      gy:Math.max(0,Math.min(rows-1,Math.round(p.y/step)))
    });
    const pointOf=(gx,gy)=>({x:Math.min(w-1,gx*step),y:Math.min(h-1,gy*step)});
    const walk=(gx,gy)=>{
      if(gx<0||gy<0||gx>=cols||gy>=rows) return false;
      const p=pointOf(gx,gy);
      return this._isSafeRoadPoint(p.x,p.y,safe);
    };

    const sg=toGrid(start), eg=toGrid(end);
    if(!walk(sg.gx,sg.gy) || !walk(eg.gx,eg.gy)) return null;

    const startId=toId(sg.gx,sg.gy);
    const endId=toId(eg.gx,eg.gy);
    const gScore=new Map([[startId,0]]);
    const prev=new Map();
    const closed=new Set();
    const heap=new MinHeap((a,b)=>a.f-b.f);
    const hCost=(gx,gy)=>Math.hypot(gx-eg.gx,gy-eg.gy)*step;
    heap.push({id:startId,gx:sg.gx,gy:sg.gy,f:hCost(sg.gx,sg.gy)});

    const dirs=[
      [1,0,step],[-1,0,step],[0,1,step],[0,-1,step],
      [1,1,step*Math.SQRT2*1.18],[-1,1,step*Math.SQRT2*1.18],[1,-1,step*Math.SQRT2*1.18],[-1,-1,step*Math.SQRT2*1.18]
    ];

    while(heap.size){
      const cur=heap.pop();
      if(closed.has(cur.id)) continue;
      closed.add(cur.id);
      if(cur.id===endId) break;

      for(const [dx,dy,move] of dirs){
        const nx=cur.gx+dx, ny=cur.gy+dy;
        if(!walk(nx,ny)) continue;
        if(dx&&dy && (!walk(cur.gx+dx,cur.gy) || !walk(cur.gx,cur.gy+dy))) continue;

        const nid=toId(nx,ny);
        if(closed.has(nid)) continue;
        const p=pointOf(nx,ny);
        const centerBias=1 + (16 / Math.max(3,this._roadClearance(p.x,p.y)));
        const ng=(gScore.get(cur.id) ?? Infinity) + move*centerBias;
        if(ng < (gScore.get(nid) ?? Infinity)){
          gScore.set(nid,ng);
          prev.set(nid,cur.id);
          heap.push({id:nid,gx:nx,gy:ny,f:ng+hCost(nx,ny)});
        }
      }
    }

    if(!prev.has(endId) && startId!==endId) return null;
    const ids=[];
    let c=endId;
    ids.push(c);
    while(c!==startId){
      c=prev.get(c);
      if(c==null) return null;
      ids.push(c);
    }
    ids.reverse();

    const points=ids.map(id=>{
      const gy=Math.floor(id/cols);
      const gx=id-gy*cols;
      return pointOf(gx,gy);
    });
    points[0]=start;
    points[points.length-1]=end;
    return {points:this._smoothRoadPoints(points,safe),visited:closed.size};
  }

  _pointsLength(points){
    let total=0;
    for(let i=1;i<points.length;i++) total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    return total;
  }

  _routeLineIsSafe(a,b,safe=1,step=3){
    if(!this.roadNav) return true;
    const len=Math.hypot(b.x-a.x,b.y-a.y);
    const steps=Math.max(1,Math.ceil(len/step));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=a.x+(b.x-a.x)*t;
      const y=a.y+(b.y-a.y)*t;
      if(!this._isSafeRoadPoint(x,y,safe)) return false;
    }
    return true;
  }

  _repairGraphForRoadMask(){
    if(!this.city || !this.roadNav) return;
    const safe=4;
    const kept=[];

    for(const edge of this.city.graph.edges){
      const a=this.city.graph.nodes.get(edge.a);
      const b=this.city.graph.nodes.get(edge.b);
      if(!a || !b) continue;

      const cp=this._curveBetween(edge.a,edge.b);
      const samples=[];
      let good=0;
      let total=0;
      let prev=null;
      let length=0;
      const steps=Math.max(8,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6));

      for(let i=0;i<=steps;i++){
        const p=bezierPoint(a,b,cp.c1x,cp.c1y,cp.c2x,cp.c2y,i/steps);
        samples.push(p);
        if(this._isSafeRoadPoint(p.x,p.y,safe)) good++;
        total++;
        if(prev) length += Math.hypot(p.x-prev.x,p.y-prev.y);
        prev=p;
      }

      // Edge dipakai hanya kalau mayoritas titiknya benar-benar berada di jalan.
      // Ini mencegah Dijkstra memilih node/edge yang melenceng dari badan jalan.
      const ratio=good/Math.max(1,total);
      const straightOk=this._routeLineIsSafe(a,b,safe,3);
      if(ratio>=0.92 || straightOk){
        edge.dist=Math.max(1,length || Math.hypot(b.x-a.x,b.y-a.y));
        kept.push(edge);
      }
    }

    this.city.graph.edges=kept;
    for(const n of this.city.graph.nodes.values()) n.adj=[];
    for(const e of kept){
      const a=this.city.graph.nodes.get(e.a);
      const b=this.city.graph.nodes.get(e.b);
      if(!a || !b) continue;
      a.adj.push({node:b,edge:e});
      b.adj.push({node:a,edge:e});
    }
    console.info('Graph route repaired for road mask:', kept.length, 'valid edges kept.');
  }

  _snapPointToRouteRoad(p,safe=1,radius=34){
    if(!p || !this.roadNav) return p;
    const currentClear=this._roadClearance(p.x,p.y);
    if(currentClear>=safe) return {x:p.x,y:p.y};
    const q=this._nearestSafeRoadPoint(p.x,p.y,safe,radius);
    return q ? {x:q.x,y:q.y} : {x:p.x,y:p.y};
  }

  _snapEndpointToRoad(p){
    // Khusus marker START/FINISH, cari posisi paling aman di jalan terdekat.
    if(!p || !this.roadNav) return p;
    for(const safe of [12,10,9,8,7,6,5,4,3,2,1]){
      const q=this._nearestSafeRoadPoint(p.x,p.y,safe,190);
      if(q) return {x:q.x,y:q.y};
    }
    return {x:p.x,y:p.y};
  }

  _forceNodeToRoad(id){
    if(!id || !this.roadNav) return false;
    const n=this.city?.graph?.nodes?.get(id);
    if(!n) return false;
    const q=this._snapEndpointToRoad(n);
    if(!q) return false;
    n.x=q.x;
    n.y=q.y;
    const meta=this.city.nodesMeta.find(m=>m.id===id);
    if(meta){ meta.x=q.x; meta.y=q.y; }
    this._refreshGraphGeometry();
    return this._roadClearance(q.x,q.y)>=4;
  }

  _cleanRoutePoints(points,minGap=2.4){
    const out=[];
    for(const p of points || []){
      if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const last=out[out.length-1];
      if(last && Math.hypot(p.x-last.x,p.y-last.y)<minGap) continue;
      out.push({x:p.x,y:p.y});
    }
    return out;
  }

  _buildGraphRoutePoints(path){
    if(!path || path.length<2) return [];
    const pts=[];

    for(let i=1;i<path.length;i++){
      const a=this.city.graph.nodes.get(path[i-1]);
      const b=this.city.graph.nodes.get(path[i]);
      if(!a || !b) continue;
      const cp=this._curveBetween(path[i-1],path[i]);
      const len=Math.max(1,bezierLength(a,b,cp.c1x,cp.c1y,cp.c2x,cp.c2y));
      const steps=Math.max(16,Math.ceil(len/3));

      for(let s=0;s<=steps;s++){
        if(i>1 && s===0) continue;
        const raw=bezierPoint(a,b,cp.c1x,cp.c1y,cp.c2x,cp.c2y,s/steps);
        const snapped=this._snapPointToRouteRoad(raw,5,38);
        pts.push(snapped);
      }
    }

    const cleaned=this._smoothRoadPoints(this._cleanRoutePoints(pts,1.0),4);
    if(cleaned.length){
      cleaned[0]=this._snapEndpointToRoad(cleaned[0]);
      cleaned[cleaned.length-1]=this._snapEndpointToRoad(cleaned[cleaned.length-1]);
    }
    return cleaned;
  }

  _graphRouteIsUsable(points){
    if(!points || points.length<2) return false;
    if(!this.roadNav) return true;

    let unsafe=0;
    let total=0;
    for(let i=0;i<points.length;i++){
      const p=points[i];
      if(!this._isSafeRoadPoint(p.x,p.y,4)) unsafe++;
      total++;
      if(i>0 && !this._routeLineIsSafe(points[i-1],p,4,3)) unsafe+=2;
    }
    return unsafe/Math.max(1,total) <= 0.08;
  }

  _findGraphDijkstraRoute(startId,endId){
    if(!this.city || !startId || !endId) return null;
    const start=this.city.graph.nodes.get(startId);
    const end=this.city.graph.nodes.get(endId);
    if(!start || !end) return null;
    if(!start.adj?.length || !end.adj?.length) return null;

    const route=new Dijkstra(this.city.graph).find(startId,endId);
    if(!route?.path || route.path.length<2) return null;

    const routePoints=this._buildGraphRoutePoints(route.path);
    if(!this._graphRouteIsUsable(routePoints)) return null;

    return {
      path:route.path,
      routePoints,
      visited:route.visited,
      steps:[],
      time:route.time,
      totalDist:this._pointsLength(routePoints)
    };
  }

  _findRoadMaskRoute(startId,endId){
    const startNode=this.city.graph.nodes.get(startId);
    const endNode=this.city.graph.nodes.get(endId);
    if(!startNode || !endNode) return null;

    for(const safe of [10,8,6,4,3,2,1]){
      const start=this._nearestSafeRoadPoint(startNode.x,startNode.y,safe);
      const end=this._nearestSafeRoadPoint(endNode.x,endNode.y,safe);
      if(!start || !end) continue;
      const t0=performance.now();
      const route=this._astarRoadRoute(start,end,safe);
      if(route?.points?.length>1){
        const pts=route.points.slice();
        pts[0]=this._snapEndpointToRoad(pts[0]);
        pts[pts.length-1]=this._snapEndpointToRoad(pts[pts.length-1]);
        return {
          path:[startId,endId],
          routePoints:pts,
          visited:{size:route.visited},
          steps:[],
          time:performance.now()-t0,
          totalDist:this._pointsLength(pts)
        };
      }
    }
    return null;
  }

  _computeRoute(){
    // Prioritas utama: Dijkstra memakai node/edge jalan yang sudah dibersihkan.
    // Fallback mask jalan hanya dipakai kalau graph tidak menemukan rute aman.
    const graphRoute=this._findGraphDijkstraRoute(this.startId,this.endId);
    if(graphRoute) return graphRoute;

    const visual=this._findRoadMaskRoute(this.startId,this.endId);
    if(visual) return visual;
    return {path:[],routePoints:[],visited:{size:0},steps:[],time:0,totalDist:0};
  }

  _pickRandomPair(){
    const requiredSafe=this.roadNav ? Math.max(4,this.roadNav.safe || 7) : 0;
    let nodes=Array.from(this.city.graph.nodes.keys()).filter(id=>{
      const n=this.city.graph.nodes.get(id);
      return n && n.adj && n.adj.length>0 && (!this.roadNav || this._roadClearance(n.x,n.y)>=requiredSafe);
    });

    if(nodes.length<2 && this.roadNav){
      nodes=Array.from(this.city.graph.nodes.keys()).filter(id=>{
        const n=this.city.graph.nodes.get(id);
        return n && n.adj && n.adj.length>0 && !!this._nearestSafeRoadPoint(n.x,n.y,3,120);
      });
    }

    if(nodes.length<2){
      nodes=Array.from(this.city.graph.nodes.keys()).filter(id=>{
        const n=this.city.graph.nodes.get(id);
        return n && n.adj && n.adj.length>0;
      });
    }

    if(nodes.length<2) return false;

    const dijkstra=new Dijkstra(this.city.graph);
    const minGaps=[430,320,230];
    let best=null;

    for(const minGap of minGaps){
      for(let attempt=0; attempt<260; attempt++){
        const start=nodes[Math.floor(Math.random()*nodes.length)];
        const end=nodes[Math.floor(Math.random()*nodes.length)];
        if(start===end) continue;

        const a=this.city.graph.nodes.get(start);
        const b=this.city.graph.nodes.get(end);
        if(!a || !b) continue;

        if(this.roadNav && (this._roadClearance(a.x,a.y)<2 || this._roadClearance(b.x,b.y)<2)) continue;

        const gap=Math.hypot(b.x-a.x,b.y-a.y);
        if(gap<minGap) continue;

        const route=dijkstra.find(start,end);
        if(!route?.path || route.path.length<2 || !Number.isFinite(route.totalDist)) continue;

        const ratio=route.totalDist/Math.max(1,gap);
        const score=(ratio*1000) + (route.totalDist*0.06) - (gap*0.12);

        if(!best || score<best.score){
          best={start,end,score,ratio,totalDist:route.totalDist,gap};
        }

        // Jika sudah menemukan pasangan yang rutenya cukup langsung,
        // hentikan lebih cepat agar tombol Acak Rute tetap responsif.
        if(best && best.ratio<=1.65 && attempt>60) break;
      }

      if(best && best.ratio<=2.15) break;
    }

    if(!best){
      const start=nodes[Math.floor(Math.random()*nodes.length)];
      let end=start;
      for(let i=0;i<80 && end===start;i++){
        end=nodes[Math.floor(Math.random()*nodes.length)];
      }
      if(start===end) return false;
      best={start,end};
    }

    this.startId=best.start;
    this.endId=best.end;
    this._forceNodeToRoad(this.startId);
    this._forceNodeToRoad(this.endId);
    return true;
  }

  _auto(){
    if(!this._pickRandomPair()) return;
    this.result=null;
    this.vehicle.visible=false;
    this.renderer.t=0;
    this.manualMode=false;
    this._rst();
  }

  _randomRoute(){
    if(!this.city){
      this.msg('Peta belum siap.');
      return;
    }

    let lastResult=null;
    for(let attempt=0; attempt<30; attempt++){
      if(!this._pickRandomPair()){
        this.msg('Node rute belum tersedia.');
        return;
      }

      const route=this._computeRoute();
      lastResult=route;
      const hasRoute=(route?.routePoints?.length>1) || (route?.path?.length>1);
      if(hasRoute){
        this.result=route;
        this.vehicle.visible=false;
        this.renderer.t=0;
        this.manualMode=false;
        this._stats(false);
        this.msg('Rute acak berhasil dibuat. START dan FINISH sudah dikunci di badan jalan. Klik Start Track untuk menjalankan mobil.');
        return;
      }
    }

    this.result=lastResult || {path:[],routePoints:[],visited:{size:0},steps:[],time:0,totalDist:0};
    this.vehicle.visible=false;
    this.renderer.t=0;
    this._stats(false);
    this.msg('Rute acak belum menemukan jalan yang aman. Klik Acak Rute lagi atau pilih titik manual.');
  }

  _zoomBy(factor){
    this.cam.tz=Math.max(0.25,Math.min(3.5,this.cam.tz*factor));
    this._clampCamera();
  }

  msg(t){ document.getElementById('statusBar').innerText=t; }
  _rst(){ }

  _stats(showTime=false){
    if(!this.result){ this._rst(); return; }
  }

  _curveBetween(aId,bId){
    const a=this.city.graph.nodes.get(aId);
    const b=this.city.graph.nodes.get(bId);
    return this.renderer._curve(a,b,this.city.curvedSegs);
  }

  _densifyTrackPoints(points,step=1.2){
    const out=[];
    const src=this._cleanRoutePoints(points,0.4);
    if(!src.length) return out;

    out.push({x:src[0].x,y:src[0].y});
    for(let i=1;i<src.length;i++){
      const a=src[i-1];
      const b=src[i];
      const len=Math.hypot(b.x-a.x,b.y-a.y);
      const pieces=Math.max(1,Math.ceil(len/step));
      for(let s=1;s<=pieces;s++){
        const t=s/pieces;
        out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
      }
    }
    return out;
  }

  _stabilizeTrackPoints(points,safe=2){
    if(!points || points.length<5) return points || [];
    let pts=points.map(p=>({x:p.x,y:p.y}));

    for(let pass=0;pass<5;pass++){
      const next=[pts[0]];

      for(let i=1;i<pts.length-1;i++){
        const radius=pass<2 ? 3 : 5;
        let sx=0, sy=0, weight=0;
        for(let j=Math.max(0,i-radius);j<=Math.min(pts.length-1,i+radius);j++){
          const dist=Math.abs(i-j);
          const w=radius+1-dist;
          sx+=pts[j].x*w;
          sy+=pts[j].y*w;
          weight+=w;
        }

        let q={
          x:pts[i].x*0.38 + (sx/weight)*0.62,
          y:pts[i].y*0.38 + (sy/weight)*0.62
        };

        if(this.roadNav && !this._isSafeRoadPoint(q.x,q.y,safe)){
          q=this._nearestSafeRoadPoint(q.x,q.y,safe,18) || pts[i];
        }

        const prev=next[next.length-1];
        const after=pts[i+1];
        const ok=this._routeLineIsSafe(prev,q,safe,2) &&
                 this._routeLineIsSafe(q,after,safe,2);
        next.push(ok ? q : pts[i]);
      }

      next.push(pts[pts.length-1]);
      pts=this._cleanRoutePoints(next,0.55);
    }

    return pts;
  }

  _vehicleTrackPoints(routePoints){
    if(!routePoints || routePoints.length<2) return [];

    let pts=this._cleanRoutePoints(routePoints,0.8);
    const safe=this.roadNav ? 3 : 1;

    // Chaikin corner cutting membuat gerakan mobil lebih lembut.
    // Setiap potongan baru dicek lagi ke mask jalan agar tidak memotong keluar badan jalan.
    for(let pass=0;pass<3;pass++){
      if(pts.length<3) break;
      const next=[pts[0]];
      let changed=false;

      for(let i=0;i<pts.length-1;i++){
        const a=pts[i];
        const b=pts[i+1];
        const q={x:a.x*0.72+b.x*0.28,y:a.y*0.72+b.y*0.28};
        const r={x:a.x*0.28+b.x*0.72,y:a.y*0.28+b.y*0.72};
        const prev=next[next.length-1];
        const after=pts[i+2] || b;
        const ok=this._routeLineIsSafe(prev,q,safe,2) &&
                 this._routeLineIsSafe(q,r,safe,2) &&
                 this._routeLineIsSafe(r,after,safe,2);

        if(ok){
          next.push(q,r);
          changed=true;
        }else{
          next.push(b);
        }
      }

      const last=pts[pts.length-1];
      const tail=next[next.length-1];
      if(last && (!tail || Math.hypot(last.x-tail.x,last.y-tail.y)>0.5)){
        next.push(last);
      }

      pts=this._cleanRoutePoints(next,0.8);
      if(!changed) break;
    }

    pts=this._densifyTrackPoints(pts,0.8);
    pts=this._stabilizeTrackPoints(pts,this.roadNav ? 2 : 1);
    return this._densifyTrackPoints(pts,0.6);
  }

  _buildTrack(path, routePoints=null){
    // Anti-drift track:
    // Obyek bergerak mengikuti polyline rute visual dari mask jalan.
    // Dengan begitu tampilan rute dan posisi kendaraan tidak keluar dari badan jalan.
    const samples=[];
    let total=0;
    const pushSample=(x,y)=>{
      const last=samples[samples.length-1];
      if(last){
        const segLen=Math.hypot(x-last.x,y-last.y);
        if(segLen<0.5) return;
        total += segLen;
      }
      samples.push({x,y,d:total});
    };

    if(routePoints?.length){
      const pts=this._vehicleTrackPoints(routePoints);
      for(let i=0;i<pts.length;i++){
        pushSample(pts[i].x,pts[i].y);
      }
      return {samples,total};
    }

    for(let i=0;i<path.length;i++){
      const n=this.city.graph.nodes.get(path[i]);
      if(!n) continue;
      if(i===0){
        pushSample(n.x,n.y);
        continue;
      }

      const prev=this.city.graph.nodes.get(path[i-1]);
      if(!prev) continue;
      const len=Math.hypot(n.x-prev.x,n.y-prev.y);
      const steps=Math.max(1,Math.ceil(len/2));
      for(let s=1;s<=steps;s++){
        const t=s/steps;
        pushSample(prev.x+(n.x-prev.x)*t, prev.y+(n.y-prev.y)*t);
      }
    }

    return {samples,total};
  }

  _sampleTrack(track,distance){
    if(!track || !track.samples || track.samples.length<2) return null;

    const d=Math.max(0,Math.min(distance,track.total));
    const pts=track.samples;

    let lo=0, hi=pts.length-1;
    while(lo<hi){
      const mid=(lo+hi)>>1;
      if(pts[mid].d<d) lo=mid+1;
      else hi=mid;
    }

    const i=Math.max(1,lo);
    const p0=pts[i-1];
    const p1=pts[i];
    const span=Math.max(0.0001,p1.d-p0.d);
    const t=(d-p0.d)/span;

    const x=p0.x+(p1.x-p0.x)*t;
    const y=p0.y+(p1.y-p0.y)*t;

    // Rotasi dihitung dari jendela yang cukup lebar supaya arah mobil tidak patah di tikungan.
    const look=Math.max(18,Math.min(44,Math.floor(pts.length/22)));
    const back=pts[Math.max(0,i-look)];
    const front=pts[Math.min(pts.length-1,i+look)];
    const angle=Math.atan2(front.y-back.y,front.x-back.x);

    return {x,y,angle};
  }

  _startTrack(){
    this.vehicleAnimation.startTrack();
  }

  _runRoute(){
    console.log('[App] _runRoute called', { startId: this.startId, endId: this.endId });
    if(!this.startId||!this.endId){
      this.msg('Pilih Titik Awal dan Akhir terlebih dahulu!');
      console.log('[App] _runRoute aborted: missing endpoints');
      return;
    }
    this._optimizeSelectedEndpoints();
    this.result=this._computeRoute();
    console.log('[App] _runRoute result', { pathLen: this.result?.path?.length, routePtsLen: this.result?.routePoints?.length });
    this.vehicle.visible=false;
    this.renderer.t=0;
    this._stats(false);
    if((!this.result.path || this.result.path.length<2) && (!this.result.routePoints || this.result.routePoints.length<2)){
      this.msg('Tidak ada rute jalan visual yang aman antara titik ini.');
      console.log('[App] _runRoute no valid route');
      return;
    }
    this.msg('Rute ditemukan. START dan FINISH sudah disesuaikan ke jalur jalan. Klik Start Track untuk menjalankan mobil.');
  }

  _updateVehicle(){
    this.vehicleAnimation.updateVehicle();
  }

  initEvents(){
    // Semua event UI sekarang ditangani oleh modul UIController / ButtonHandler / CameraController.
  }

  loop(){
    requestAnimationFrame(()=>this.loop());
    this._clampCamera();
    this.cam.x+=(this.cam.tx-this.cam.x)*0.14;
    this.cam.y+=(this.cam.ty-this.cam.y)*0.14;
    this.cam.z+=(this.cam.tz-this.cam.z)*0.14;
    this.vehicleAnimation.updateVehicle();

    this.bgX.clearRect(0,0,this.bgC.width,this.bgC.height);
    this.bgX.save();
    this.renderer.applyCamera(this.bgX,this.cam);
    if(this.city) this.bgX.drawImage(this.off,0,0);
    this.bgX.restore();

    if(this.city) this.renderer.renderFg(this.city,this.result,this.startId,this.endId,this.cam,this.vehicle);
  }
}
