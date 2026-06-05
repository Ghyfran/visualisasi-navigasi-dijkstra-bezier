"use strict";

class VehiclePath {
  constructor(app){
    this.app=app;
  }
  pointsLength(points){
    let total=0;
    for(let i=1;i<(points || []).length;i++){
      total += Math.hypot(points[i].x-points[i-1].x, points[i].y-points[i-1].y);
    }
    return total;
  }
  cleanRoutePoints(points,minGap=2.4){
    const out=[];
    for(const p of points || []){
      if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const last=out[out.length-1];
      if(last && Math.hypot(p.x-last.x,p.y-last.y)<minGap) continue;
      out.push({x:p.x,y:p.y});
    }
    return out;
  }
  routeLineIsSafe(a,b,safe=1,step=3){
    if(!a || !b) return false;
    if(!this.app.roadNav) return true;
    const len=Math.hypot(b.x-a.x,b.y-a.y);
    const steps=Math.max(1,Math.ceil(len/step));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=a.x+(b.x-a.x)*t;
      const y=a.y+(b.y-a.y)*t;
      if(!this.app._isSafeRoadPoint(x,y,safe)) return false;
    }
    return true;
  }
  densifyTrackPoints(points,step=1.2){
    const out=[];
    const src=this.cleanRoutePoints(points,0.4);
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
  stabilizeTrackPoints(points,safe=2){
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
        if(this.app.roadNav && !this.app._isSafeRoadPoint(q.x,q.y,safe)){
          q=this.app._nearestSafeRoadPoint(q.x,q.y,safe,18) || pts[i];
        }
        const prev=next[next.length-1];
        const after=pts[i+1];
        const ok=this.routeLineIsSafe(prev,q,safe,2) && this.routeLineIsSafe(q,after,safe,2);
        next.push(ok ? q : pts[i]);
      }
      next.push(pts[pts.length-1]);
      pts=this.cleanRoutePoints(next,0.55);
    }
    return pts;
  }
  vehicleTrackPoints(routePoints){
    if(!routePoints || routePoints.length<2) return [];
    let pts=this.cleanRoutePoints(routePoints,0.8);
    const safe=this.app.roadNav ? 3 : 1;

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
        const ok=this.routeLineIsSafe(prev,q,safe,2) &&
                 this.routeLineIsSafe(q,r,safe,2) &&
                 this.routeLineIsSafe(r,after,safe,2);
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
      pts=this.cleanRoutePoints(next,0.8);
      if(!changed) break;
    }
    pts=this.densifyTrackPoints(pts,0.8);
    pts=this.stabilizeTrackPoints(pts,this.app.roadNav ? 2 : 1);
    return this.densifyTrackPoints(pts,0.6);
  }
  buildTrack(path,routePoints=null){
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
      const pts=this.vehicleTrackPoints(routePoints);
      for(const p of pts) pushSample(p.x,p.y);
      return {samples,total};
    }
    for(let i=0;i<(path || []).length;i++){
      const n=this.app.city.graph.nodes.get(path[i]);
      if(!n) continue;
      if(i===0){
        pushSample(n.x,n.y);
        continue;
      }
      const prev=this.app.city.graph.nodes.get(path[i-1]);
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
  sampleTrack(track,distance){
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

    const look=Math.max(18,Math.min(44,Math.floor(pts.length/22)));
    const back=pts[Math.max(0,i-look)];
    const front=pts[Math.min(pts.length-1,i+look)];
    const angle=Math.atan2(front.y-back.y,front.x-back.x);
    return {x,y,angle};
  }
}
