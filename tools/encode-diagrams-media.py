#!/usr/bin/env python3
"""Encode the Diagrams PNG capture without an RGB -> YUV -> GIF round trip."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def run(*args):
    return subprocess.check_output(args)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('frames', type=Path)
parser.add_argument('--composition', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True, help='Output stem, without suffix')
parser.add_argument('--theme', choices=['light', 'dark'], required=True)
args = parser.parse_args()
frames = [args.frames / f'frame_{i:06d}.png' for i in range(1, 361)]
outputs = [args.output.with_suffix(ext) for ext in ['.mp4', '.gif', '.json']]
if any(not p.is_file() for p in frames) or len(list(args.frames.glob('*.png'))) != 360:
    parser.error('Expected exactly 360 PNG frames captured at 60fps')
if any(p.exists() for p in outputs):
    parser.error('Output exists; choose a new stem to preserve the previous render')
args.output.parent.mkdir(parents=True, exist_ok=True)
paper = (255, 255, 255) if args.theme == 'light' else (13, 17, 23)
ffmpeg = ['ffmpeg', '-v', 'error', '-n', '-framerate', '60', '-start_number', '1', '-i', str(args.frames / 'frame_%06d.png')]
# HyperFrames' alpha-capable PNG export removes the composition root background.
# Restore that original canvas behind the RGBA frames before either encoding.
paper_hex = ''.join(f'{channel:02x}' for channel in paper)
matte = f'color=c=0x{paper_hex}:s=1600x900:r=60:d=6,format=rgba[paper];[paper][0:v]overlay=format=rgb:shortest=1,format=rgb24'
# The MP4 is an RGB lossless editing master; README playback uses the GIF.
run(*ffmpeg, '-filter_complex', matte, '-c:v', 'libx264rgb', '-crf', '0', '-preset', 'medium',
    '-pix_fmt', 'rgb24', '-color_range', 'pc', '-colorspace', 'rgb',
    '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-movflags', '+faststart', str(outputs[0]))
# Quantize the original RGB frames, not a lossy MP4. A full histogram retains
# the static paper color; no dithering is needed on these flat UI surfaces.
run(*ffmpeg, '-filter_complex', matte + ',fps=25,scale=1200:-1:flags=lanczos,format=rgb24,split[a][b];'
    '[a]palettegen=stats_mode=full:reserve_transparent=0[p];[b][p]paletteuse=dither=none',
    '-loop', '0', str(outputs[1]))

receipt = {
    'hyperframes': '0.8.38',
    'source_revision': run('git', 'rev-parse', 'HEAD').decode().strip(),
    'source_sha256': sha(args.composition / 'index.html'),
    'inputs_sha256': {str(p.relative_to(args.composition)): sha(p) for p in sorted(args.composition.rglob('*'))
                     if p.is_file() and (p.parent.name == 'assets' or p.name in ['index.html', 'index.motion.json', 'inputs.json'])},
    'input_sequence_sha256': hashlib.sha256(''.join(f'{p.name} {sha(p)}\n' for p in frames).encode()).hexdigest(),
    'encoding': {'alpha_composite_rgb': paper,
                 'mp4': 'libx264rgb CRF 0, full-range RGB, sRGB transfer; editing master',
                 'gif': 'PNG RGB -> 25fps/1200px -> full histogram palette -> no dither; infinite loop'},
    'validation': {'native_recording': False, 'browser_playback_verified': False,
                   'source_background_rgb': paper, 'input_frames': 360},
    'outputs': [],
}
for p, count in zip(outputs[:2], [360, 150]):
    probe = json.loads(run('ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                          'stream=width,height,avg_frame_rate,nb_read_frames,pix_fmt,color_range,color_space,profile:format=duration',
                          '-of', 'json', str(p)))
    stream = probe['streams'][0]
    assert int(stream['nb_read_frames']) == count and float(probe['format']['duration']) == 6, 'Unexpected frame count or duration'
    corner = run('ffmpeg', '-v', 'error', '-i', str(p), '-vf', 'format=rgb24,crop=iw:20:0:0', '-f', 'rawvideo', '-')
    assert len(corner) == count * stream['width'] * 20 * 3 and corner == bytes(paper) * (len(corner) // 3), 'Paper color changed during encoding'
    boundary = run('ffmpeg', '-v', 'error', '-i', str(p), '-vf', f'select=eq(n\\,0)+eq(n\\,{count-1}),format=rgb24',
                   '-fps_mode', 'passthrough', '-f', 'rawvideo', '-')
    assert len(boundary) == stream['width'] * stream['height'] * 3 * 2, 'Missing boundary frame'
    assert boundary[:len(boundary)//2] == boundary[len(boundary)//2:], 'Loop boundary changed'
    if p.suffix == '.gif':
        assert b'NETSCAPE2.0\x03\x01\x00\x00\x00' in p.read_bytes(), 'GIF must loop indefinitely'
    receipt['outputs'].append({'file': p.name, 'bytes': p.stat().st_size, 'sha256': sha(p), **probe,
                               'decoded_background_rgb': paper, 'background_unique_colors': 1,
                               'background_region': [0, 0, stream['width'], 20],
                               'background_frames_checked': count, 'first_last_pixels_equal': True})
outputs[2].write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
