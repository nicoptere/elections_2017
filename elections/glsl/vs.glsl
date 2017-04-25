attribute float votes;

uniform vec3 color;
uniform vec2 minmax;
uniform float colorId;
uniform float useGradient;
uniform float threshold;
uniform float scale;

varying vec3 col;
varying float alpha;
void main(){

    vec3 pos = position;
    pos.z = votes * scale;

    col = color;//mix( vec3( 1.,0.,0.), vec3( 0.,0.,1.), colorId );

    alpha = step( threshold, votes ) * ( smoothstep( minmax.x, minmax.y, votes ) + useGradient );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1. );
}
