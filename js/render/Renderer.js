"use strict";

// Semua proses menggambar canvas/map/rute/mobil dipisah di sini.

class Renderer {
  constructor(offCtx,fgCtx){
    this.off=offCtx;
    this.fg=fgCtx;
    this.t=0;
    this.roadRenderer=new RoadRenderer();
    this.buildingRenderer=new BuildingRenderer();
    this.treeRenderer=new TreeRenderer();
  }

  _curve(a,b,segs){
    for(const s of segs){
      if(s.from===a.id&&s.to===b.id) return s;
      if(s.from===b.id&&s.to===a.id){
        return {from:s.to,to:s.from,c1x:s.c2x,c1y:s.c2y,c2x:s.c1x,c2y:s.c1y,cpx:s.cpx,cpy:s.cpy};
      }
    }
    return {c1x:(a.x+b.x)/2,c1y:(a.y+b.y)/2,c2x:(a.x+b.x)/2,c2y:(a.y+b.y)/2};
  }

  _roadPath(ctx,a,b,cp){
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.bezierCurveTo(cp.c1x,cp.c1y,cp.c2x,cp.c2y,b.x,b.y);
  }

  _drawRoadLayer(ctx, city, width, color){
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    for(const e of city.graph.edges){
      const a=city.graph.nodes.get(e.a), b=city.graph.nodes.get(e.b);
      const cp=this._curve(a,b,city.curvedSegs);
      this._roadPath(ctx,a,b,cp);
      ctx.stroke();
    }
  }

  _routePath(ctx, city, path, routePoints){
    ctx.beginPath();
    if(routePoints?.length){
      for(let i=0;i<routePoints.length;i++){
        const p=routePoints[i];
        if(i===0) ctx.moveTo(p.x,p.y);
        else ctx.lineTo(p.x,p.y);
      }
      return;
    }
    for(let i=0;i<path.length;i++){
      const n=city.graph.nodes.get(path[i]);
      if(!n) continue;
      if(i===0) ctx.moveTo(n.x,n.y);
      else ctx.lineTo(n.x,n.y);
    }
  }

  _roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  _drawBuilding(ctx,b){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.13)';
    this._roundRect(ctx,b.x+5,b.y+5,b.w,b.h,6); ctx.fill();

    ctx.fillStyle=b.c;
    this._roundRect(ctx,b.x,b.y,b.w,b.h,6); ctx.fill();

    ctx.strokeStyle='rgba(30,41,59,0.75)';
    ctx.lineWidth=2; ctx.stroke();

    ctx.fillStyle='rgba(255,255,255,0.72)';
    const cols=Math.max(2,Math.floor(b.w/22));
    const rows=Math.max(1,Math.floor(b.h/18));
    const gapX=b.w/(cols+1), gapY=b.h/(rows+1);
    for(let r=1;r<=rows;r++){
      for(let c=1;c<=cols;c++){
        ctx.fillRect(b.x+gapX*c-4,b.y+gapY*r-4,8,8);
      }
    }
    ctx.restore();
  }

  _drawTree(ctx,t){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(t.x+4,t.y+t.r+5,t.r+2,Math.max(4,t.r-2),0,0,Math.PI*2); ctx.fill();

    ctx.fillStyle='#7c4a21';
    ctx.fillRect(t.x-Math.max(2,t.r*0.18),t.y+t.r*0.4,Math.max(4,t.r*0.36),t.r+4);

    ctx.fillStyle='#2f9e44';
    ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.fill();

    ctx.fillStyle='#69db7c';
    ctx.beginPath(); ctx.arc(t.x-t.r*0.28,t.y-t.r*0.22,t.r*0.45,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle='rgba(20,83,45,0.65)';
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  _drawFlag(ctx, n, color, label){
    if(!n) return;
    ctx.save();
    ctx.lineWidth=3;
    ctx.strokeStyle='#1f2937';
    ctx.beginPath();
    ctx.moveTo(n.x, n.y - 4);
    ctx.lineTo(n.x, n.y - 55);
    ctx.stroke();

    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(n.x + 2, n.y - 55);
    ctx.lineTo(n.x + 38, n.y - 45);
    ctx.lineTo(n.x + 2, n.y - 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.45)';
    ctx.lineWidth=1.5;
    ctx.stroke();

    ctx.fillStyle='rgba(0,0,0,0.68)';
    ctx.beginPath();
    ctx.ellipse(n.x, n.y + 6, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle='#fff';
    ctx.font='bold 12px Arial';
    ctx.textAlign='center';
    ctx.fillText(label, n.x + 19, n.y - 42);
    ctx.restore();
  }

  _drawVehicle(ctx, vehicle){
    if(!vehicle || !vehicle.visible) return;
    const {x,y,angle,type='car'} = vehicle;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);

    // Bayangan mengikuti arah kendaraan.
    ctx.fillStyle='rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 19, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if(type === 'motor'){
      ctx.strokeStyle='#111827';
      ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(13,0); ctx.stroke();
      ctx.fillStyle='#ef4444';
      ctx.beginPath(); ctx.arc(0,-4,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#111827';
      ctx.beginPath(); ctx.arc(-15,5,5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(15,5,5,0,Math.PI*2); ctx.fill();
    } else if(type === 'bike'){
      ctx.strokeStyle='#111827';
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(-12,4,7,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(12,4,7,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12,4); ctx.lineTo(0,-7); ctx.lineTo(12,4); ctx.lineTo(-2,4); ctx.closePath(); ctx.stroke();
      ctx.fillStyle='#2563eb';
      ctx.beginPath(); ctx.arc(0,-12,5,0,Math.PI*2); ctx.fill();
    } else if(type === 'person'){
      ctx.fillStyle='#111827';
      ctx.beginPath(); ctx.arc(0,-10,6,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#111827';
      ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(0,10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-8,9); ctx.moveTo(0,2); ctx.lineTo(8,9); ctx.stroke();
    } else {
      // Mobil tampak atas, sejajar dengan tangent jalan.
      ctx.fillStyle='#ef4444';
      this._roundRect(ctx,-18,-10,36,20,6);
      ctx.fill();
      ctx.strokeStyle='#7f1d1d';
      ctx.lineWidth=2;
      ctx.stroke();

      ctx.fillStyle='#bfdbfe';
      this._roundRect(ctx,-6,-8,14,16,4);
      ctx.fill();

      ctx.fillStyle='#111827';
      ctx.fillRect(-14,-12,8,4);
      ctx.fillRect(7,-12,8,4);
      ctx.fillRect(-14,8,8,4);
      ctx.fillRect(7,8,8,4);

      ctx.fillStyle='#fef3c7';
      ctx.beginPath();
      ctx.moveTo(18,-6);
      ctx.lineTo(24,0);
      ctx.lineTo(18,6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  renderBg(city){
    const ctx=this.off;
    ctx.clearRect(0,0,city.W,city.H);

    // Peta bawaan canvas dihapus. Background sekarang memakai SVG final yang dikirim pengguna.
    if(city.mapImage && city.mapImage.complete){
      ctx.drawImage(city.mapImage,0,0,city.W,city.H);
    }else{
      ctx.fillStyle='#e7e6e5';
      ctx.fillRect(0,0,city.W,city.H);
    }

    this.buildingRenderer.renderBuildings(ctx, city.buildings);
    this.treeRenderer.renderTrees(ctx, city.trees);
  }

  applyCamera(ctx,cam){
    ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
  }

  screenToWorld(sx,sy,cam,canvas){
    return {
      x: ((sx-canvas.width/2)/cam.z) + cam.x,
      y: ((sy-canvas.height/2)/cam.z) + cam.y
    };
  }

  worldToScreen(wx,wy,cam,canvas){
    return {
      x: (wx-cam.x)*cam.z + canvas.width/2,
      y: (wy-cam.y)*cam.z + canvas.height/2
    };
  }

  renderFg(city,result,startId,endId,cam,vehicle){
    const ctx=this.fg;
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.save();

    // Semua layer foreground memakai sistem koordinat canvas yang sama
    // dengan background, jadi rute tetap menempel saat peta digeser atau di-zoom.
    this.applyCamera(ctx,cam);

    if(result?.steps){
      // Node eksplorasi hanya ditampilkan sebagai titik kecil.
      // Tidak lagi memakai lingkaran besar yang menutupi peta.
      const lim=Math.min(result.steps.length,Math.floor(this.t*10));
      for(let i=0;i<lim;i+=8){
        const st=result.steps[i], n=city.graph.nodes.get(st.id); if(!n) continue;
        if(st.type==='visit'){
          ctx.fillStyle='rgba(139,92,246,0.38)';
          ctx.beginPath(); ctx.arc(n.x,n.y,1.7,0,Math.PI*2); ctx.fill();
        }
      }
    }

    // Rute visual memakai hasil A* dari mask jalan SVG agar tidak keluar badan jalan.
    if(result?.routePoints?.length>1 || result?.path?.length>1){
      this.roadRenderer.renderRoute(ctx, city, result.path, result.routePoints, {
        width: 8,
        color: '#22c55e',
        shadowColor:'#4ade80',
        shadowBlur:10
      });
      this.roadRenderer.renderRoute(ctx, city, result.path, result.routePoints, {
        width: 2.8,
        color: 'rgba(255,255,255,0.9)',
        dash: [14,18]
      });
    }

    // Node biasa sengaja tidak digambar semua agar peta bersih.
    // Node tetap aktif untuk Dijkstra, pilih manual, dan Start Track.

    const routePts=result?.routePoints || [];
    const startFlag=routePts.length>0 ? routePts[0] : city.graph.nodes.get(startId);
    const endFlag=routePts.length>1 ? routePts[routePts.length-1] : city.graph.nodes.get(endId);
    if(startId) this._drawFlag(ctx, startFlag, '#22c55e', 'START');
    if(endId) this._drawFlag(ctx, endFlag, '#ef4444', 'FINISH');

    this._drawVehicle(ctx, vehicle);

    if(cam.hoverId){
      const n=city.graph.nodes.get(cam.hoverId);
      if(n){ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(n.x,n.y,8,0,Math.PI*2); ctx.stroke();}
    }
    ctx.restore();
    this.t+=0.5;
  }
}
