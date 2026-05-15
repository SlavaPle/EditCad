export const TRIPLANAR_VERTEX_SHADER = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vObjNormal;

void main() {
  vObjPos = position;
  vObjNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const TRIPLANAR_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uOrigin;
uniform vec3 uInvSize;

varying vec3 vObjPos;
varying vec3 vObjNormal;

void main() {
  vec3 p = (vObjPos - uOrigin) * uInvSize;
  vec3 n = normalize(vObjNormal);
  vec3 blend = abs(n);
  blend = pow(blend, vec3(2.0));
  blend /= max(blend.x + blend.y + blend.z, 1e-5);

  vec3 cx = texture2D(uMap, p.yz).rgb;
  vec3 cy = texture2D(uMap, p.xz).rgb;
  vec3 cz = texture2D(uMap, p.xy).rgb;
  vec3 albedo = cx * blend.x + cy * blend.y + cz * blend.z;

  vec3 lightDir = normalize(vec3(0.5, 0.9, 0.7));
  float ndl = max(dot(n, lightDir), 0.0);
  float fill = 0.38 + 0.62 * ndl;
  vec3 ambient = vec3(0.22, 0.26, 0.32);

  gl_FragColor = vec4(albedo * fill + ambient * 0.35, 1.0);
}
`
