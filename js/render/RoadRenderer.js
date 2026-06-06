"use strict";

class RoadRenderer {
  constructor(){
    this.lineCap='round';
    this.lineJoin='round';
  }

  drawRoute(ctx, city, path, routePoints){
    if(!routePoints?.length && !path?.length) return;
    ctx.beginPath();
    if(routePoints?.length){
      for(let i=0;i<routePoints.length;i++){
        const p=routePoints[i];
        if(i===0) ctx.moveTo(p.x,p.y);
        else ctx.lineTo(p.x,p.y);
      }
    } else {
      for(let i=0;i<path.length;i++){
        const n=city.graph.nodes.get(path[i]);
        if(!n) continue;
        if(i===0) ctx.moveTo(n.x,n.y);
        else ctx.lineTo(n.x,n.y);
      }
    }
  }

  renderRoute(ctx, city, path, routePoints, options={}){
    this.drawRoute(ctx, city, path, routePoints);
    if(!routePoints?.length && !path?.length) return;
    ctx.strokeStyle=options.color || '#22c55e';
    ctx.lineWidth=options.width || 8;
    ctx.lineCap=this.lineCap;
    ctx.lineJoin=this.lineJoin;
    if(options.dash) ctx.setLineDash(options.dash);
    if(options.shadowColor){
      ctx.shadowColor=options.shadowColor;
      ctx.shadowBlur=options.shadowBlur || 0;
    }
    ctx.stroke();
    ctx.shadowBlur=0;
    ctx.setLineDash([]);
  }
}
