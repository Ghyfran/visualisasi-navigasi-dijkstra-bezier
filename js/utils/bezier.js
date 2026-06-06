"use strict";

function bezierLength(p0, p3, c1x, c1y, c2x, c2y) {
    const x0 = p0.x, y0 = p0.y;
    const x3 = p3.x, y3 = p3.y;
    const x1 = c1x, y1 = c1y;
    const x2 = c2x, y2 = c2y;

    const steps = 24;
    let length = 0;
    let prevX = x0;
    let prevY = y0;

    for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const xt = mt * mt * mt * x0
      + 3 * mt * mt * t * x1
      + 3 * mt * t * t * x2
      + t * t * t * x3;
    const yt = mt * mt * mt * y0
      + 3 * mt * mt * t * y1
      + 3 * mt * t * t * y2
      + t * t * t * y3;

    const dx = xt - prevX;
    const dy = yt - prevY;
    length += Math.hypot(dx, dy);
    prevX = xt;
    prevY = yt;
    }

    return Math.max(0, length);
}

function bezierPoint(a, b, c1x, c1y, c2x, c2y, t){
    const x0 = a.x, y0 = a.y;
    const x1 = c1x, y1 = c1y;
    const x2 = c2x, y2 = c2y;
    const x3 = b.x, y3 = b.y;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    const x = mt2 * mt * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t2 * t * x3;
    const y = mt2 * mt * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t2 * t * y3;
    return { x, y };
}
