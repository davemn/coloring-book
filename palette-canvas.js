(function($, exports){
  exports.ANIMATION_SHOW = 'show';
  
  exports.instance = function(opts){
    var $canvas = opts.$canvas;
    this.swatches = opts.swatches;
    this.curSwatchName = null;
    
    this.swatchSize = 40;
    this.swatchPadding = 8;
    
    this.origin = [8.5,8.5]; // 8.5, 8.5 TODO center palette
    this.touchId = -1;
    
    // - Size & setup drawing environment ---
    this.canvas = $canvas.get(0);
    this.ctx = this.canvas.getContext('2d');
    
    // ---
    var width = $canvas.parent('.canvas-container').width();
    var height = this.swatchSize + (2*this.swatchPadding) + 0.5;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // - Bind listeners ---
    
    this.canvas.addEventListener('touchstart', this);
    this.canvas.addEventListener('touchend', this);
    this.canvas.addEventListener('touchcancel', this);
    this.canvas.addEventListener('touchmove', this);
    
    this.drawSwatchGrid();
  };
  
  exports.instance.prototype.swatchIdxOfCoords = function(x, y){
    var regionSize = this.swatchSize + this.swatchPadding;
    var minX, maxX;
    
    var minY = this.origin[1];
    var maxY = this.origin[1] + regionSize;
    
    if(y < minY || maxY <= y) // no further checks needed if not on same row as swatches
      return -1;
    
    for(var regionI=0; regionI < Object.keys(this.swatches).length; regionI++){
      minX = this.origin[0] + regionI * regionSize;
      maxX = this.origin[0] + (regionI+1) * regionSize;
    
      if(minX <= x && x < maxX)
        return regionI;
    }
    return -1;
  };
  
  exports.instance.prototype.handleEvent = function(evt){
    evt.preventDefault();
    
    var curTouch = evt.changedTouches;
    var curSwatchIdx = -1;
    var canvasClientRect = this.canvas.getBoundingClientRect();
    
    switch(evt.type){
      case 'touchstart':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          var relX = curTouch[touchI].clientX - canvasClientRect.left;
          var relY = curTouch[touchI].clientY - canvasClientRect.top;
          
          // if position is inside a swatch, use this ID and no others
          curSwatchIdx = this.swatchIdxOfCoords(relX, relY);
          
          if(curSwatchIdx !== -1){
            this.touchId = curTouch[touchI].identifier;
            this.setSwatch(Object.keys(this.swatches)[curSwatchIdx]);
            break;
          }
        }
        break;
      case 'touchmove':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          var foundId = curTouch[touchI].identifier;
          if(foundId !== this.touchId) // only continue the touch that fell inside a swatch region
            continue;
          
          var relX = curTouch[touchI].clientX - canvasClientRect.left;
          var relY = curTouch[touchI].clientY - canvasClientRect.top;
                    
          curSwatchIdx = this.swatchIdxOfCoords(relX, relY);
          
          if(curSwatchIdx !== -1)
            this.setSwatch(Object.keys(this.swatches)[curSwatchIdx]);
        }
        break;
      case 'touchend':
      case 'touchcancel':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          var foundId = curTouch[touchI].identifier;
          if(foundId !== this.touchId) // only continue the touch that fell inside a swatch region
            continue;
          
          var relX = curTouch[touchI].clientX - canvasClientRect.left;
          var relY = curTouch[touchI].clientY - canvasClientRect.top;
                    
          curSwatchIdx = this.swatchIdxOfCoords(relX, relY);
          
          if(curSwatchIdx !== -1)
            this.setSwatch(Object.keys(this.swatches)[curSwatchIdx]);
          
          this.touchId = -1;
        }
        break;
    }
  };
      
  // - Public API ---
  
  exports.instance.prototype.drawSwatchGrid = function(){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'black';
    
    var curPos = {x: this.origin[0], y: this.origin[1]};
    
    var swatchI=0;
    var curSwatchSize = this.swatchSize;
    
    for(var swatch in this.swatches){
      this.ctx.fillStyle = this.swatches[swatch];
      
      // Make the currently-selected swatch, if any, larger than the rest
      if(this.curSwatchName && swatch === this.curSwatchName)
        curSwatchSize = this.swatchSize+(this.swatchPadding/2);
      else
        curSwatchSize = this.swatchSize;
      
      this.ctx.fillRect(curPos.x, curPos.y, curSwatchSize, curSwatchSize);
      this.ctx.strokeRect(curPos.x, curPos.y, curSwatchSize, curSwatchSize);
      
      curPos.x += this.swatchSize + this.swatchPadding;
     
      swatchI++;
    }
    
    this.ctx.restore();
  };
          
  exports.instance.prototype.changeSwatch = function(callback){
    this.swatchCallback = callback.bind(this);
  };
  
  exports.instance.prototype.setSwatch = function(swatchName){
    this.curSwatchName = swatchName;
    
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
    this.drawSwatchGrid();
    
    if(this.swatchCallback)
      this.swatchCallback(this.swatches[this.curSwatchName]);
  };
  
})(jQuery, window.PaletteCanvas = {});