# Headless sim playtest

The gameplay simulation is pure C#, so it runs without Unity:

    cd unity/Tools/SimHarness && dotnet run

A bot aims lead-corrected shots at matching spirits and plays the slice
level to a result. Expected (seed 1234, verified): WON in ~8s, 19 shots,
7 bursts, 7 orbit shifts, deterministic across runs. Use this before any
sim change — it caught two real porting bugs on its first run.
