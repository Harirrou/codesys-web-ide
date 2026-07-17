// Wispbloom — spirit removal: procedural-noise dissolve with a glowing
// edge, plus a subtle rim light for depth while alive (_Dissolve = 0).
// Shader Graph equivalent: Sprite Unlit graph — Simple Noise → Step by
// (1-_Dissolve) → multiply alpha; edge = Step band * _EdgeColor added;
// rim = (1 - dot from center) * _RimColor.
Shader "Wispbloom/SpriteDissolve"
{
    Properties
    {
        _MainTex ("Sprite", 2D) = "white" {}
        _Dissolve ("Dissolve", Range(0,1)) = 0
        [HDR] _EdgeColor ("Edge", Color) = (1.6,1.3,0.9,1)
        _RimColor ("Rim", Color) = (1,1,1,0.35)
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            float _Dissolve;
            half4 _EdgeColor;
            half4 _RimColor;

            struct Attributes { float4 pos : POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };
            struct Varyings  { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.pos = TransformObjectToHClip(v.pos.xyz);
                o.uv = v.uv;
                o.color = v.color;
                return o;
            }

            float hash(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
            float noise(float2 p)
            {
                float2 i = floor(p), f = frac(p);
                f = f * f * (3.0 - 2.0 * f);
                return lerp(lerp(hash(i), hash(i + float2(1, 0)), f.x),
                            lerp(hash(i + float2(0, 1)), hash(i + float2(1, 1)), f.x), f.y);
            }

            half4 frag(Varyings i) : SV_Target
            {
                half4 tex = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv) * i.color;

                // Rim: brightens toward the sprite edge for painted depth.
                float2 c = i.uv - 0.5;
                float rim = smoothstep(0.28, 0.5, length(c));
                tex.rgb += _RimColor.rgb * rim * _RimColor.a * tex.a;

                // Dissolve with glowing crumble edge.
                float n = noise(i.uv * 9.0);
                float cut = 1.0 - _Dissolve * 1.15;
                float alive = step(n, cut);
                float edge = step(n, cut + 0.12) - alive;
                tex.rgb += _EdgeColor.rgb * edge;
                tex.a *= saturate(alive + edge);
                return tex;
            }
            ENDHLSL
        }
    }
}
