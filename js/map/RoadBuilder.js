"use strict";

class RoadBuilder {
  constructor(city){
    this.city = city;
  }

  build(){
    if(!this.city || !this.city.graph) return null;
    return this.city.graph;
  }
}
