(function($, exports){
  exports.ANIMATION_SHOW = 'show';
  
  exports.instance = function(opts){
    var $canvas = opts.$canvas;
    this.swatches = opts.swatches;
    this.swatchCount = Object.keys(this.swatches).length;
    this.curSwatchName = null;
    
    this.swatchSize = 40;
    this.swatchPadding = 8;
    
    this.origin = [8.5, 8.5];
    this.touchId = -1;
    
    // - Size & setup drawing environment ---
    this.canvas = $canvas.get(0);
    this.ctx = this.canvas.getContext('2d');
    
    this.sizeCanvas();
    
    // - Bind listeners ---
    
    this.canvas.addEventListener('pointerdown', this);
    this.canvas.addEventListener('pointerup', this);
    this.canvas.addEventListener('pointercancel', this);
    this.canvas.addEventListener('pointermove', this);
    
    this.drawSwatchGrid();
  };
  
  exports.instance.prototype.sizeCanvas = function(){
    var width = $(this.canvas).parent('.canvas-container').width();
    // var height = width / this.canvasAspect;
    var height = this.swatchSize + (2*this.swatchPadding);
    
    // Don't set canvas size using CSS properties! Will result in pixel scaling instead of viewport scaling.
    // http://stackoverflow.com/a/331462
    
    this.canvas.width  = width;
    this.canvas.height = height;
    
    this.origin[0] = (this.canvas.width - (this.swatchCount * (this.swatchSize+this.swatchPadding))) / 2;
    this.origin[0] = Math.max(0, this.origin[0]);
  };
  
  exports.instance.prototype.swatchIdxOfCoords = function(x, y){
    var regionSize = this.swatchSize + this.swatchPadding;
    var minX, maxX;
    
    var minY = this.origin[1];
    var maxY = this.origin[1] + regionSize;
    
    if(y < minY || maxY <= y) // no further checks needed if not on same row as swatches
      return -1;
    
    for(var regionI=0; regionI < this.swatchCount; regionI++){
      minX = this.origin[0] + regionI * regionSize;
      maxX = this.origin[0] + (regionI+1) * regionSize;
    
      if(minX <= x && x < maxX)
        return regionI;
    }
    return -1;
  };
  
  exports.instance.prototype.handleEvent = function(evt){
    evt.preventDefault();
    
    var curSwatchIdx = -1;
    var canvasClientRect = this.canvas.getBoundingClientRect();
    
    switch(evt.type){
      case 'pointerdown':
        var relX = evt.clientX - canvasClientRect.left;
        var relY = evt.clientY - canvasClientRect.top;
        
        // if position is inside a swatch, use this ID and no others
        curSwatchIdx = this.swatchIdxOfCoords(relX, relY);
        
        if(curSwatchIdx !== -1){
          this.touchId = evt.pointerId;
          this.setSwatch(Object.keys(this.swatches)[curSwatchIdx]);
          break;
        }
        break;
      case 'pointermove':
        if(evt.pointerId !== this.touchId)
          break;
        
        var relX = evt.clientX - canvasClientRect.left;
        var relY = evt.clientY - canvasClientRect.top;
        
        curSwatchIdx = this.swatchIdxOfCoords(relX, relY);
        
        if(curSwatchIdx !== -1)
          this.setSwatch(Object.keys(this.swatches)[curSwatchIdx]);
        
        break;
      case 'pointerup':
      case 'pointercancel':
        if(evt.pointerId !== this.touchId) // only continue the touch that fell inside a swatch region
          break;
        
        var relX = evt.clientX - canvasClientRect.left;
        var relY = evt.clientY - canvasClientRect.top;
        
        curSwatchIdx = this.swatchIdxOfCoords(relX, relY);
        
        if(curSwatchIdx !== -1)
          this.setSwatch(Object.keys(this.swatches)[curSwatchIdx]);
        
        this.touchId = -1;
        break;
    }
  };
      
  // - Public API ---
  
  exports.instance.prototype.drawSwatchGrid = function(){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'black';
    
    var curPos = {x: this.origin[0], y: this.origin[1]};
    
    var maxVisible = this.swatchCount;
    var totalWidth = (this.swatchCount*this.swatchSize) + ((this.swatchCount-1)*this.swatchPadding);
    if(totalWidth > this.canvas.width){
      maxVisible = Math.floor(this.canvas.width/(this.swatchSize+this.swatchPadding));
      curPos.x = (this.canvas.width - (maxVisible * (this.swatchSize+this.swatchPadding))) / 2;
    }
    
    var swatchI=0;
    var curSwatchSize = this.swatchSize;
    
    for(var swatch in this.swatches){
      if(swatchI >= maxVisible)
        break; // don't draw anymore if they won't fit
      
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