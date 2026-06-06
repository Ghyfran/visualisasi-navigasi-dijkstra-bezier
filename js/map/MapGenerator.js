"use strict";

class MapGenerator {
  constructor(){
    this.width = MAP_W;
    this.height = MAP_H;
  }

  generate(){
    return { width: this.width, height: this.height };
  }
}
