"use strict";

class TreeRenderer {
  renderTrees(ctx, trees){
    if(!trees || !trees.length) return;
    for(const t of trees){
      this.renderTree(ctx,t);
    }
  }

  renderTree(ctx,t){
    if(!t) return;
    ctx.save();
    ctx.fillStyle=t.c || '#2f9e44';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r || 6, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle=t.trunkColor || '#7c4a21';
    const trunkHeight = Math.max(4, (t.r || 6) * 0.6);
    ctx.fillRect(t.x - 3, t.y, 6, trunkHeight);
    ctx.restore();
  }
}
