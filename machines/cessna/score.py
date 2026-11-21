"""Score for the Cessna 337 main landing gear film: a light bed (Dmaj9 chords, 96 bpm) at one level the whole way, a
hydraulic whine under every gear transit, a soft air at each lift-off, a tyre thud at each touchdown and a quiet
click on every button the operator presses.

    python3 kit/run_sfx.py machines/cessna/score.py

Every time comes from timeline.json (the film's script); sequence lengths mirror flight.js.
"""

import os

from sfx.score_kit import airy, bed, chords, hz, motor, thud
from sfx.synth import click

TIMELINE = "timeline.json"
OUT = os.path.join(os.environ.get("TEARDOWN_OUT", "teardown-out"), "cessna-score.wav")
TARGET_LUFS = -14.0
SEED = 17

CHORDS = chords("Dmaj9:D2 A2 C#3 E3 F#3/D1", "Bm9:B1 F#2 A2 C#3 D3/B0", "Gmaj7:G2 D3 F#3 B3/G1", "A6sus:A2 D3 E3 F#3 B3/A1")
MOTIF = [(0.5, hz("F#5")), (1.5, hz("A5")), (2.5, hz("E5"))]


def score(mix, tl):
    # every time below comes from the film's script in timeline.json
    dur = tl["duration"]
    script = tl["script"]
    clicks = [e["t"] for e in script if e["t"] > 0]
    takeoffs = [e["t"] for e in script if e.get("seq") == "takeoff"]
    landings = [e["t"] for e in script if e.get("seq") == "landing"]
    left, right, low, drums = bed(dur, 96, CHORDS, MOTIF, motif_voice="epiano", kicks=(0, 2.5), snares=(), hats=8, swing=0.0, keys_vel=0.7, keys_lp=3600)
    mix.put_stereo(0, left, right, 0.12)
    mix.put(0, low, 0.12)
    mix.put(0, drums, 0.045)
    for t0 in takeoffs:
        mix.put(t0 + 1.8, airy(1.6, 500, 1600, 0.6), 0.03)
        mix.put(t0 + 2.3, motor(2.2, 190, 1300, 14), 0.02)
    for t0 in landings:
        mix.put(t0 + 0.6, motor(2.4, 175, 1200, 14), 0.02)
        if t0 + 5.2 < dur - 0.3:
            mix.put(t0 + 5.2, thud(80, 0.05, 0.4), 0.09)
    for t in clicks:
        mix.put(t, click(2400, 0.025), 0.055)
