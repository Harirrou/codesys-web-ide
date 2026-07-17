// Wispbloom — soft additive glow for halos, particles, trails, petals.
// Shader Graph equivalent: Sprite Unlit graph, Blend = Additive,
// BaseColor = tex.rgb * vertexColor.rgb * tex.a * vertexColor.a.
Shader "Wispbloom/Additive"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        [HDR] _Tint ("Tint", Color) = (1,1,1,1)
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
            float4 _MainTex_ST;
            half4 _Tint;

            struct Attributes { float4 pos : POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };
            struct Varyings  { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.pos = TransformObjectToHClip(v.pos.xyz);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.color = v.color * _Tint;
                return o;
            }

            half4 frag(Varyings i) : SV_Target
            {
                half4 tex = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv);
                half3 rgb = tex.rgb * i.color.rgb * tex.a * i.color.a;
                return half4(rgb, 1);
            }
            ENDHLSL
        }
    }
}
