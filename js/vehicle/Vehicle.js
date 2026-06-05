"use strict";

class Vehicle {
  constructor(type="car"){
    this.visible=false;
    this.type=Vehicle.normalizeType(type);
    this.track=null;
    this.progress=0;
    this.startTime=0;
    this.duration=0;
    this.x=0;
    this.y=0;
    this.angle=0;
  }
  static normalizeType(type){
    const allowed=new Set(["car","motor","bike","person"]);
    return allowed.has(type) ? type : "car";
  }
  static smoothstep(t){
    const v=Math.max(0,Math.min(1,t));
    return v*v*(3-2*v);
  }
  static lerp(a,b,t){
    return a+(b-a)*t;
  }
  static angleDelta(target,current){
    return Math.atan2(Math.sin(target-current),Math.cos(target-current));
  }
  reset(){
    this.visible=false;
    this.track=null;
    this.progress=0;
    this.startTime=0;
    this.duration=0;
    this.x=0;
    this.y=0;
    this.angle=0;
    return this;
  }
  setType(type){
    this.type=Vehicle.normalizeType(type);
    return this;
  }
  setTrack(track,duration,startTime=performance.now()){
    this.track=track;
    this.duration=duration;
    this.startTime=startTime;
    this.progress=0;
    this.visible=!!track && !!track.samples && track.samples.length>1;
    return this;
  }
  placeAt(sample){
    if(!sample) return this;
    this.x=sample.x;
    this.y=sample.y;
    this.angle=sample.angle || 0;
    return this;
  }
  moveSmoothlyTo(sample,t){
    if(!sample) return this;
    const prevAngle=Number.isFinite(this.angle) ? this.angle : sample.angle;
    const delta=Vehicle.angleDelta(sample.angle,prevAngle);
    const hasPrev=Number.isFinite(this.x) && Number.isFinite(this.y);
    const dist=hasPrev ? Math.hypot(sample.x-this.x,sample.y-this.y) : Infinity;

    const snap=t<0.02 || t>0.985 || dist>36;
    this.x=snap ? sample.x : Vehicle.lerp(this.x,sample.x,0.58);
    this.y=snap ? sample.y : Vehicle.lerp(this.y,sample.y,0.58);

    this.angle=prevAngle + delta*0.15;
    this.progress=t;
    return this;
  }
  stop(){
    this.visible=false;
    this.progress=1;
    return this;
  }
  isRunning(){
    return !!this.visible && !!this.track;
  }
  progressPercent(){
    return Math.round(Math.max(0,Math.min(1,this.progress))*100);
  }
  toPlainObject(){
    return {
      visible:this.visible,
      type:this.type,
      track:this.track,
      progress:this.progress,
      startTime:this.startTime,
      duration:this.duration,
      x:this.x,
      y:this.y,
      angle:this.angle
    };
  }
}
