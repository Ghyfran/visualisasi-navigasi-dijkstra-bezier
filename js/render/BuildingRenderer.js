"use strict";

class BuildingRenderer {
  renderBuildings(ctx, buildings){
    if(!buildings || !buildings.length) return;
    for(const b of buildings){
      this.renderBuilding(ctx,b);
    }
  }

  renderBuilding(ctx,b){
    if(!b) return;
    ctx.save();
    ctx.fillStyle=b.c || 'rgba(120,130,150,0.8)';
    ctx.beginPath();
    ctx.rect(b.x,b.y,b.w,b.h);
    ctx.fill();
    ctx.strokeStyle='rgba(30,41,59,0.75)';
    ctx.lineWidth=1.8;
    ctx.stroke();
    ctx.restore();
  }
}
