// Wispbloom — orbit track energy: the band texture scrolls along the ring
// (U axis wraps the circle), with a slow brightness pulse and a danger
// blush that rises as the ring nears capacity.
// Shader Graph equivalent: Sprite Unlit graph — Time*Speed → Tiling&Offset
// on U → Sample; multiply by Tint; lerp toward danger red by _Danger;
// multiply by (0.8 + 0.4*_Pulse); output additive.
Shader "Wispbloom/OrbitFlow"
{
    Properties
    {
        _MainTex ("Energy Band", 2D) = "white" {}
        _Tint ("Tint", Color) = (0.9,0.95,1,0.85)
        _Scroll ("Scroll", Float) = 0
        _Pulse ("Pulse", Range(0,1)) = 0.5
        _Danger ("Danger", Range(0,1)) = 0
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" }
        Blend One One
        ZWrite Off
        Cull Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            half4 _Tint;
            float _Scroll;
            float _Pulse;
            float _Danger;

            struct Attributes { float4 pos : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.pos = TransformObjectToHClip(v.pos.xyz);
                o.uv = v.uv;
                return o;
            }

            half4 frag(Varyings i) : SV_Target
            {
                float2 uv = float2(i.uv.x + _Scroll, i.uv.y);
                half4 tex = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);
                // Soft vertical falloff keeps painted edges even if the
                // source texture is hard-edged.
                half edge = smoothstep(0.0, 0.18, i.uv.y) * smoothstep(1.0, 0.82, i.uv.y);
                half3 col = tex.rgb * _Tint.rgb;
                col = lerp(col, half3(1.0, 0.35, 0.42), _Danger * 0.65);
                half energy = (0.75 + 0.5 * _Pulse) * _Tint.a * edge;
                return half4(col * tex.a * energy, 1);
            }
            ENDHLSL
        }
    }
}
