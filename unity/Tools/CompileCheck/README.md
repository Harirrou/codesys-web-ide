# Compile check without Unity

Compiles every Wispbloom C# file (runtime + editor) against minimal Unity
API stubs, so code changes can be verified in CI or any sandbox that has
no Unity editor:

    cd unity/Tools/CompileCheck
    dotnet build check.csproj        # runtime scripts
    dotnet build editorcheck.csproj  # + editor scripts

Expected: 0 errors on both. Stubs are signature-level only — they catch
typos, bad references and signature drift, not engine behavior.
