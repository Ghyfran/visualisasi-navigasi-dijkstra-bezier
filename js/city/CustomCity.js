"use strict";

// Pembentuk data kota dari node, edge, dan ukuran map.

class CustomCity {
    generate(){
    const graph = new Graph();
    const nodesMeta = [];
    const curvedSegs = [];

    const sx = MAP_W / ORIGINAL_MAP_W;
    const sy = MAP_H / ORIGINAL_MAP_H;
    const scalePoint = (p) => ({ x: p.x * sx, y: p.y * sy });

    for (const [id, p] of Object.entries(customNodes)) {
        const sp = scalePoint(p);
        graph.addNode(id, sp.x, sp.y);
        nodesMeta.push({id, x:sp.x, y:sp.y, isRoundabout:false, r:0});
    }

    for (const r of customRoads) {
        const [a,b,c1x,c1y,c2x,c2y] = r;
        const na = scalePoint(customNodes[a]);
        const nb = scalePoint(customNodes[b]);
      const sc1x = c1x * sx, sc1y = c1y * sy, sc2x = c2x * sx, sc2y = c2y * sy;
        const dist = bezierLength(na, nb, sc1x, sc1y, sc2x, sc2y);
        graph.addEdge(a,b,dist);
        curvedSegs.push({from:a,to:b,c1x:sc1x,c1y:sc1y,c2x:sc2x,c2y:sc2y,cpx:(sc1x+sc2x)/2,cpy:(sc1y+sc2y)/2});
    }

    // Bangunan/pohon bawaan tidak digambar lagi karena peta visual sekarang memakai SVG final.
    const safeBuildings = [];
    const safeTrees = [];
    return {graph,nodesMeta,curvedSegs,buildings:safeBuildings,trees:safeTrees,W:MAP_W,H:MAP_H,mapImage:null};
    }
}
