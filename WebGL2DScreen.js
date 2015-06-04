//drop-in webgl enhancement for canvas pixel operations
//https://github.com/kripken/webgl-2d-screen
function WebGL2DScreen(canvas) {
  var gl = null;

  var oldGetContext = (function(func) {
    return function() {
      gl = null;
      return func.apply(canvas, arguments);
    };
  })(canvas.getContext);

  canvas.getContext = function(type) {
    if (type !== '2d') return oldGetContext(type);
    var attributes = { depth: false, stencil:false };
    gl = oldGetContext('webgl', attributes) || oldGetContext('experimental-webgl', attributes);
    if (!gl) return oldGetContext('2d');

    gl.depthMask(false);

    var vertexShaderString = 
    'attribute vec2 vertexPosition;                                \n\
      varying vec2 texCoord;                                       \n\
      void main(void) {                                            \n\
        texCoord = vec2(vertexPosition.x, 1.0 - vertexPosition.y); \n\
        gl_Position = vec4(2.0 * vertexPosition - 1.0, 0.0, 1.0);  \n\
      }                                                            \n';

    var fragmentShaderString =
    'precision mediump float;                                 \n\
      uniform sampler2D texSampler;                           \n\
      varying vec2 texCoord;                                  \n\
      void main(void) {                                       \n\
        gl_FragColor = texture2D(texSampler, texCoord).rgba;  \n\
      }                                                       \n';

    var texarray, program;
    var texUnit = 0; // we will use texture unit 0 only

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderString);
    gl.compileShader(vertexShader);
    if (gl.getError() !== gl.NO_ERROR) return oldGetContext('2d');

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderString);
    gl.compileShader(fragmentShader);
    if (gl.getError() !== gl.NO_ERROR) return oldGetContext('2d');

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    if (gl.getError() !== gl.NO_ERROR) return oldGetContext('2d');

    var vertexPositionAttrLoc = gl.getAttribLocation(program, 'vertexPosition');
    gl.enableVertexAttribArray(vertexPositionAttrLoc);
    var texSamplerLoc = gl.getUniformLocation(program, 'texSampler');
    gl.uniform1i(texSamplerLoc, texUnit);

    var vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    var vertices = [ 0.0,  0.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0 ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttrLoc, 2, gl.FLOAT, false, 0, 0);

    texarray = new Uint8Array([0, 0, 0, 0,       0, 0, 0, 0,       255, 0, 0, 255,   0, 0, 0, 0,       0, 0, 0, 0,
      0, 0, 0, 0,       255, 128, 0, 255,   0, 0, 0, 0,       255, 128, 0, 255,   0, 0, 0, 0,
      255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255,
      0, 255, 0, 255,   0, 0, 0, 0,       0, 0, 0, 0,       0, 0, 0, 0,       0, 255, 0, 255,
    0, 0, 255, 255,   0, 0, 0, 0,       0, 0, 0, 0,       0, 0, 0, 0,       0, 0, 255, 255]);

    var image = null, texture = null;

    return {
      createImageData: function(w, h) {
        if (w !== canvas.width || h !== canvas.height) {
          throw 'bad inputs to createImageData';
        }
        if (image && image.width === canvas.width && image.height == canvas.height) return image;

        var data = new Uint8Array(w*h*4);

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); // 4 is the default. added for explicitness. common pitfall.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // so it works with this non-power-of-two texture
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return image = {
          width: w,
          height: h,
          data: data
        };
      },
      getImageData: function(x, y, w, h) {
        if (x !== 0 || y !== 0 || w !== canvas.width || h !== canvas.height) {
          throw 'bad inputs to getImageData';
        }
        return this.createImageData(w, h);
      },
      putImageData: function(image, x, y) {
        if (x !== 0 || y !== 0 || image.width !== canvas.width || image.height !== canvas.height) {
          throw 'bad inputs to putImageData';
        }
        gl.activeTexture(gl.TEXTURE0); // so we're being explicit with texture units. But here, texUnit is set to 0 so this is just pedantic.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, image.data);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  };

  return canvas;
}