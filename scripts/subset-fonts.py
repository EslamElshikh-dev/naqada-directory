"""Rebuild UI subsets from the licensed originals committed before subsetting.
Requires fonttools[woff] and brotli. Layout substitutions/positioning are retained.
"""
from io import BytesIO
from pathlib import Path
import subprocess
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
ranges = [(0x20,0x7e),(0x621,0x63a),(0x640,0x652),(0x660,0x66d),(0x6f0,0x6f9),(0x200c,0x200f),(0x2010,0x2027),(0x2066,0x2069)]
characters = {0x60c,0x61b,0x61f,0x670,0x2030,0x20ac,0x2212}
for start,end in ranges: characters.update(range(start,end+1))
for filename in ['ibm-plex-sans-arabic-400.woff2','ibm-plex-sans-arabic-600.woff2','noto-kufi-arabic-700.woff2']:
    source = subprocess.check_output(['git','show','598a7d9:app/fonts/'+filename],cwd=root)
    font = TTFont(BytesIO(source))
    if filename == 'ibm-plex-sans-arabic-400.woff2':
        font.flavor = None
        font.save(root/'app/fonts/ibm-plex-sans-arabic-og.ttf')
    options = subset.Options()
    options.layout_features = ['*']
    options.hinting = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(root/'app/fonts'/filename)
    assert (root/'app/fonts'/filename).stat().st_size <= 40000, filename
    print(filename, (root/'app/fonts'/filename).stat().st_size)
