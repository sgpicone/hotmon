var createRingBuffer = function(length){

    var pointer = 0, buffer = []; 
  
    return {
      get  : function(key){return buffer[key];},
      push : function(item){
        buffer[pointer] = item;
        pointer = (length + pointer +1) % length;
      },
      toString : function() {
          return "[ " + buffer.join(' ') + " ]";
      },
      getBuff : function() { return buffer; },
      findSequence : function(sequence) {
        var finder = ((pointer-1)+length) % length;
        for(var i = sequence.length-1; i > -1; i--) {
            if(buffer[finder] != sequence[i]) {
                return false;
            }
            console.log('found one @ ' + finder);
            finder = ((finder-1) + length) % length;
        }
        return true;
        }
    };
  };

module.exports = {
    createRingBuffer: createRingBuffer
}