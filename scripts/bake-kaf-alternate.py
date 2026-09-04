# يجعل شكل الكاف البديل (ss01) هو الشكل الافتراضي في خطوط ثمانية.
# يعمل من ملفات OTF الأصلية (تبقى سليمة) ويكتب woff2 جديدة للويب.
import os, shutil, sys
from fontTools.ttLib import TTFont

BASE = 'src/assets/FONTS'
FAMILIES = ['thmanyahserifdisplay', 'thmanyahseriftext']


def ss01_map(font):
    """كل استبدالات ss01 في الخط."""
    gsub = font['GSUB'].table
    subs = {}
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag != 'ss01':
            continue
        for li in fr.Feature.LookupListIndex:
            for st in gsub.LookupList.Lookup[li].SubTable:
                m = getattr(st, 'mapping', None)
                if m:
                    subs.update(m)
    return subs


def kaf_only(subs):
    """أشكال الكاف وحدها — نتجاهل بقية الحروف الـ45."""
    return {s: d for s, d in subs.items()
            if 'kaf' in s.lower() or 'kaf' in d.lower()}


total = 0
for fam in FAMILIES:
    otf_dir = os.path.join(BASE, fam, 'otf')
    out_dir = os.path.join(BASE, fam, 'woff2')
    backup = os.path.join(BASE, fam, 'woff2-original')

    # نسخة احتياطية للأصل مرة واحدة فقط
    if not os.path.isdir(backup):
        os.makedirs(backup)
        for f in os.listdir(out_dir):
            if f.endswith('.woff2'):
                shutil.copy2(os.path.join(out_dir, f), os.path.join(backup, f))
        print('نسخة احتياطية:', backup)

    for fn in sorted(os.listdir(otf_dir)):
        if not fn.endswith('.otf'):
            continue
        font = TTFont(os.path.join(otf_dir, fn))
        km = kaf_only(ss01_map(font))

        cff = font['CFF '].cff
        charstrings = cff[cff.fontNames[0]].CharStrings
        hmtx = font['hmtx']

        swapped = 0
        for src, dst in km.items():
            if src in charstrings and dst in charstrings:
                charstrings[src] = charstrings[dst]      # نفس الرسم
                if dst in hmtx.metrics:
                    hmtx[src] = hmtx[dst]                # ونفس العرض
                swapped += 1

        font.flavor = 'woff2'
        out = os.path.join(out_dir, fn.replace('.otf', '.woff2'))
        font.save(out)
        total += swapped
        print(f'  {fn:45s} → {swapped}/{len(km)} شكل كاف')

print('\nتم. إجمالي الأشكال المبدّلة:', total)
